import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { ProxusApi } from "@proxus/shared";
import { TutorChatService } from "../../domain/agents/academic-tutor/tutor-chat-service.ts";
import { ArtifactRepository, type Artifact } from "../../domain/artifacts/artifact.ts";
import { MaterialRepository } from "../../domain/materials/material.ts";

export const TutorHttpHandlers = HttpApiBuilder.group(
  ProxusApi,
  "tutor",
  Effect.fn(function* (handlers) {
    const tutor = yield* TutorChatService;

    return handlers.handle("chat", ({ payload }) =>
      tutor.sendMessage(payload).pipe(Effect.orDie)
    );
  })
);

const decodeBase64 = (data: string): Uint8Array => {
  const parts = data.split(",");
  const base64Content = parts.length > 1 ? (parts[1] ?? "") : data;
  return Uint8Array.from(Buffer.from(base64Content, "base64"));
};

export const MaterialsHttpHandlers = HttpApiBuilder.group(
  ProxusApi,
  "materials",
  Effect.fn(function* (handlers) {
    const materials = yield* MaterialRepository;

    return handlers
      .handle("list", () => materials.list().pipe(
        Effect.map((items) => ({ materials: items })),
        Effect.orDie
      ))
      .handle("get", ({ params }) => materials.get(params.id).pipe(Effect.orDie))
      .handle("upload", ({ payload }) => {
        const content = decodeBase64(payload.contentBase64);
        return materials.upload({
          fileName: payload.fileName,
          content,
          title: payload.title
        }).pipe(Effect.orDie);
      })
      .handle("renderPages", ({ params, payload }) =>
        materials.renderPages(params.id, payload.pages).pipe(Effect.orDie)
      )
      .handle("delete", ({ params }) => materials.delete(params.id).pipe(
        Effect.map(() => ({ success: true, id: params.id })),
        Effect.orDie
      ));
  })
);

const artifactSummary = (artifact: Artifact) => ({
  id: artifact.id,
  kind: artifact.kind,
  title: artifact.title
});

export const ArtifactsHttpHandlers = HttpApiBuilder.group(
  ProxusApi,
  "artifacts",
  Effect.fn(function* (handlers) {
    const artifacts = yield* ArtifactRepository;

    return handlers
      .handle("list", ({ query }) => artifacts.listArtifacts({ kind: query.kind }).pipe(
        Effect.map((items) => ({ artifacts: items.map(artifactSummary) })),
        Effect.orDie
      ))
      .handle("get", ({ params }) => artifacts.getArtifact(params.id).pipe(Effect.orDie))
      .handle("submit", ({ params, payload }) => artifacts.submitAttempt({
        ...payload,
        artifactId: params.id
      }).pipe(
        Effect.flatMap((attempt) => artifacts.gradeAttempt(attempt.id)),
        Effect.orDie
      ))
      .handle("delete", ({ params }) => artifacts.deleteArtifact(params.id).pipe(
        Effect.map(() => ({ success: true, id: params.id })),
        Effect.orDie
      ));
  })
);

export const HttpHandlersLive = Layer.mergeAll(
  TutorHttpHandlers,
  MaterialsHttpHandlers,
  ArtifactsHttpHandlers
);
