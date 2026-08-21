import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { ProxusApi } from "@proxus/shared";
import { TutorChatService } from "../../domain/agents/academic-tutor/tutor-chat-service.ts";
import { ArtifactRepository, type Artifact } from "../../domain/artifacts/artifact.ts";
import { MaterialRepository } from "../../domain/materials/material.ts";
import { KnowledgeRepository } from "../../domain/knowledge/knowledge-profile.ts";
import { UserProfileRepository } from "../../domain/user-profile/user-profile.ts";
import { failAsHttpError, failAsServiceHttpError, failAsTutorHttpError } from "./http-errors.ts";

export const TutorHttpHandlers = HttpApiBuilder.group(
  ProxusApi,
  "tutor",
  Effect.fn(function* (handlers) {
    const tutor = yield* TutorChatService;

    return handlers.handle("chat", ({ payload }) =>
      tutor.sendMessage(payload).pipe(Effect.catch(failAsTutorHttpError))
    );
  })
);

export const decodeBase64 = (data: string): Uint8Array => {
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
        Effect.catch(failAsServiceHttpError)
      ))
      .handle("get", ({ params }) => materials.get(params.id).pipe(
        Effect.catch(failAsHttpError)
      ))
      .handle("upload", ({ payload }) => {
        const content = decodeBase64(payload.contentBase64);
        return materials.upload({
          fileName: payload.fileName,
          content,
          title: payload.title
        }).pipe(
          Effect.catch(failAsHttpError)
        );
      })
      .handle("renderPages", ({ params, payload }) =>
        materials.renderPages(params.id, payload.pages).pipe(
          Effect.catch(failAsHttpError)
        )
      )
      .handle("delete", ({ params }) => materials.delete(params.id).pipe(
        Effect.map(() => ({ success: true, id: params.id })),
        Effect.catch(failAsHttpError)
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
        Effect.catch(failAsServiceHttpError)
      ))
      .handle("get", ({ params }) => artifacts.getArtifact(params.id).pipe(
        Effect.catch(failAsHttpError)
      ))
      .handle("submit", ({ params, payload }) => artifacts.submitAttempt({
        ...payload,
        artifactId: params.id
      }).pipe(
        Effect.flatMap((attempt) => artifacts.gradeAttempt(attempt.id)),
        Effect.catch(failAsHttpError)
      ))
      .handle("delete", ({ params }) => artifacts.deleteArtifact(params.id).pipe(
        Effect.map(() => ({ success: true, id: params.id })),
        Effect.catch(failAsHttpError)
      ));
  })
);

export const KnowledgeHttpHandlers = HttpApiBuilder.group(
  ProxusApi,
  "knowledge",
  Effect.fn(function* (handlers) {
    const knowledge = yield* KnowledgeRepository;

    return handlers
      .handle("getProfile", () => knowledge.getProfile().pipe(Effect.catch(failAsServiceHttpError)))
      .handle("updateGapStatus", ({ params, payload }) =>
        knowledge.updateGapStatus(params.id, payload.status).pipe(
          Effect.catch(failAsHttpError)
        )
      )
      .handle("clearProfile", () =>
        knowledge.clearProfile().pipe(
          Effect.map(() => ({ success: true })),
          Effect.catch(failAsServiceHttpError)
        )
      );
  })
);

export const UserProfileHttpHandlers = HttpApiBuilder.group(
  ProxusApi,
  "userProfile",
  Effect.fn(function* (handlers) {
    const userProfile = yield* UserProfileRepository;

    return handlers
      .handle("getProfile", () => userProfile.getProfile().pipe(Effect.catch(failAsServiceHttpError)))
      .handle("saveProfile", ({ payload }) => userProfile.saveProfile(payload).pipe(Effect.catch(failAsServiceHttpError)))
      .handle("clearProfile", () =>
        userProfile.clearProfile().pipe(
          Effect.map(() => ({ success: true })),
          Effect.catch(failAsServiceHttpError)
        )
      );
  })
);

export const HttpHandlersLive = Layer.mergeAll(
  TutorHttpHandlers,
  MaterialsHttpHandlers,
  ArtifactsHttpHandlers,
  KnowledgeHttpHandlers,
  UserProfileHttpHandlers
);
