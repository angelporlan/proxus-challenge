import { Effect, FileSystem, Layer, Schema, Stream } from "effect";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import { createServer } from "node:http";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiScalar } from "effect/unstable/httpapi";
import { LanguageModel } from "effect/unstable/ai";
import { ProxusApi, TutorChatRequest, TutorChatStreamEvent } from "@proxus/shared";
import { GeminiModel } from "../../domain/agents/gemini.ts";
import { TutorChatService, TutorChatServiceLive } from "../../domain/agents/academic-tutor/tutor-chat-service.ts";
import { FileArtifactRepository } from "../../infra/artifacts/file-artifact-repository.ts";
import { FileKnowledgeRepository } from "../../infra/knowledge/file-knowledge-repository.ts";
import { FileMaterialRepository } from "../../infra/materials/file-material-repository.ts";
import { FileUserProfileRepository } from "../../infra/user-profile/file-user-profile-repository.ts";
import { MaterialRepository } from "../../domain/materials/material.ts";
import { PopplerPdfService } from "../../infra/materials/poppler-pdf-service.ts";
import { HttpHandlersLive } from "./handlers.ts";

const ApiRoutes = HttpApiBuilder.layer(ProxusApi, {
  openapiPath: "/openapi.json"
}).pipe(
  Layer.provide(HttpHandlersLive)
);

const DocsRoute = HttpApiScalar.layer(ProxusApi, {
  path: "/docs"
});

const encoder = new TextEncoder();

const encodeNdjson = (event: TutorChatStreamEvent) =>
  encoder.encode(`${JSON.stringify(Schema.encodeSync(TutorChatStreamEvent)(event))}\n`);

const TutorStreamRoute = HttpRouter.add("POST", "/api/tutor/chat/stream", () =>
  Effect.gen(function* () {
    const input = yield* HttpServerRequest.schemaBodyJson(TutorChatRequest);
    const tutor = yield* TutorChatService;
    const languageModel = yield* LanguageModel.LanguageModel;
    const body = tutor.streamMessage(input).pipe(
      Stream.provideService(LanguageModel.LanguageModel, languageModel),
      Stream.map(encodeNdjson)
    );

    return HttpServerResponse.stream(body, {
      contentType: "application/x-ndjson",
      headers: {
        "cache-control": "no-cache",
        "x-accel-buffering": "no"
      }
    });
  })
);

const RawPdfRoute = HttpRouter.add("GET", "/api/materials/:id/raw", () =>
  Effect.gen(function* () {
    const { id } = yield* HttpRouter.schemaPathParams(Schema.Struct({ id: Schema.String }));
    const materials = yield* MaterialRepository;
    const fs = yield* FileSystem.FileSystem;
    const filePath = yield* materials.getFilePath(id).pipe(Effect.orDie);
    const stat = yield* fs.stat(filePath).pipe(Effect.orDie);
    const stream = fs.stream(filePath);

    return HttpServerResponse.stream(stream, {
      contentType: "application/pdf",
      headers: {
        "content-disposition": "inline",
        "cache-control": "public, max-age=3600",
        ...(stat.size !== undefined ? { "content-length": String(stat.size) } : {})
      }
    });
  })
);

const Routes = Layer.mergeAll(ApiRoutes, DocsRoute, TutorStreamRoute, RawPdfRoute);

const DomainLive = Layer.mergeAll(
  TutorChatServiceLive,
  GeminiModel
);

const KnowledgeLayer = FileKnowledgeRepository.layer(".data/knowledge");
const UserProfileLayer = FileUserProfileRepository.layer(".data");

const InfraLive = Layer.mergeAll(
  FileMaterialRepository.layer(".data/materials/pdfs").pipe(
    Layer.provide(PopplerPdfService.layer)
  ),
  FileArtifactRepository.layer(".data/artifacts").pipe(
    Layer.provide(KnowledgeLayer)
  ),
  KnowledgeLayer,
  UserProfileLayer
);

export const HttpServerLive = HttpRouter.serve(Routes).pipe(
  Layer.provide(DomainLive),
  Layer.provide(InfraLive),
  Layer.provide(NodeHttpServer.layer(
    () => createServer(),
    { port: Number(process.env.PORT ?? "3000") }
  ))
);
