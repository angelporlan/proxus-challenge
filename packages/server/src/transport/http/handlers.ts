import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { ProxusApi } from "@proxus/shared";
import { TutorChatService } from "../../domain/agents/academic-tutor/tutor-chat-service.ts";
import { ArtifactRepository, type Artifact } from "../../domain/artifacts/artifact.ts";
import { MaterialRepository } from "../../domain/materials/material.ts";
import { KnowledgeRepository } from "../../domain/knowledge/knowledge-profile.ts";
import { UserProfileRepository } from "../../domain/user-profile/user-profile.ts";

// ---------------------------------------------------------------------------
// Domain error → descriptive die messages
// ---------------------------------------------------------------------------
// Effect HTTP API v4 handlers must return values matching the success schema,
// so we can't return arbitrary HTTP error responses directly. Instead we map
// domain errors to descriptive Error objects via Effect.die, which causes the
// framework to return a 500 with the error message. This is a pragmatic
// improvement over the previous bare `Effect.orDie` which lost all context.
//
// A future improvement would be to declare error schemas in the shared API
// contract (HttpApiEndpoint error) so the framework can return typed 404/400.
// ---------------------------------------------------------------------------

const describeMaterialError = (error: unknown) => {
  if (typeof error === "object" && error !== null && "_tag" in error) {
    const err = error as Record<string, unknown>;
    switch (err._tag) {
      case "MaterialNotFound":
        return new Error(`Material not found: ${String(err.materialId ?? "unknown")}`);
      case "InvalidPageRange":
        return new Error(`Invalid page range: ${String(err.reason ?? "")}`);
      case "InvalidMaterialError":
        return new Error(`Invalid material: ${String(err.reason ?? "")}`);
      default:
        return new Error(`Material operation failed: ${String(err._tag)}`);
    }
  }
  return error instanceof Error ? error : new Error(String(error));
};

const describeArtifactError = (error: unknown) => {
  if (typeof error === "object" && error !== null && "_tag" in error) {
    const err = error as Record<string, unknown>;
    switch (err._tag) {
      case "ArtifactNotFound":
        return new Error(`Artifact not found: ${String(err.artifactId ?? "unknown")}`);
      case "AttemptNotFound":
        return new Error(`Attempt not found: ${String(err.attemptId ?? "unknown")}`);
      case "ArtifactTypeMismatch":
        return new Error(`Artifact type mismatch: expected ${String(err.expected ?? "")}, got ${String(err.actual ?? "")}`);
      case "QuestionNotFound":
        return new Error(`Question not found: ${String(err.questionId ?? "unknown")}`);
      case "AnswerTypeMismatch":
        return new Error(`Answer type mismatch for question ${String(err.questionId ?? "unknown")}`);
      case "ArtifactRepositorySerializationError":
        return new Error(`Invalid artifact data: ${String(err.reason ?? "")}`);
      default:
        return new Error(`Artifact operation failed: ${String(err._tag)}`);
    }
  }
  return error instanceof Error ? error : new Error(String(error));
};

const describeKnowledgeError = (error: unknown) => {
  if (typeof error === "object" && error !== null && "_tag" in error) {
    const err = error as Record<string, unknown>;
    switch (err._tag) {
      case "GapNotFound":
        return new Error(`Knowledge gap not found: ${String(err.gapId ?? "unknown")}`);
      default:
        return new Error(`Knowledge operation failed: ${String(err._tag)}`);
    }
  }
  return error instanceof Error ? error : new Error(String(error));
};

// ---------------------------------------------------------------------------
// HTTP API Groups
// ---------------------------------------------------------------------------

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
        Effect.catch((error) => Effect.die(describeMaterialError(error)))
      ))
      .handle("get", ({ params }) => materials.get(params.id).pipe(
        Effect.catch((error) => Effect.die(describeMaterialError(error)))
      ))
      .handle("upload", ({ payload }) => {
        const content = decodeBase64(payload.contentBase64);
        return materials.upload({
          fileName: payload.fileName,
          content,
          title: payload.title
        }).pipe(
          Effect.catch((error) => Effect.die(describeMaterialError(error)))
        );
      })
      .handle("renderPages", ({ params, payload }) =>
        materials.renderPages(params.id, payload.pages).pipe(
          Effect.catch((error) => Effect.die(describeMaterialError(error)))
        )
      )
      .handle("delete", ({ params }) => materials.delete(params.id).pipe(
        Effect.map(() => ({ success: true, id: params.id })),
        Effect.catch((error) => Effect.die(describeMaterialError(error)))
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
        Effect.catch((error) => Effect.die(describeArtifactError(error)))
      ))
      .handle("get", ({ params }) => artifacts.getArtifact(params.id).pipe(
        Effect.catch((error) => Effect.die(describeArtifactError(error)))
      ))
      .handle("submit", ({ params, payload }) => artifacts.submitAttempt({
        ...payload,
        artifactId: params.id
      }).pipe(
        Effect.flatMap((attempt) => artifacts.gradeAttempt(attempt.id)),
        Effect.catch((error) => Effect.die(describeArtifactError(error)))
      ))
      .handle("delete", ({ params }) => artifacts.deleteArtifact(params.id).pipe(
        Effect.map(() => ({ success: true, id: params.id })),
        Effect.catch((error) => Effect.die(describeArtifactError(error)))
      ));
  })
);

export const KnowledgeHttpHandlers = HttpApiBuilder.group(
  ProxusApi,
  "knowledge",
  Effect.fn(function* (handlers) {
    const knowledge = yield* KnowledgeRepository;

    return handlers
      .handle("getProfile", () => knowledge.getProfile().pipe(
        Effect.catch((error) => Effect.die(describeKnowledgeError(error)))
      ))
      .handle("updateGapStatus", ({ params, payload }) =>
        knowledge.updateGapStatus(params.id, payload.status).pipe(
          Effect.catch((error) => Effect.die(describeKnowledgeError(error)))
        )
      )
      .handle("clearProfile", () =>
        knowledge.clearProfile().pipe(
          Effect.map(() => ({ success: true })),
          Effect.catch((error) => Effect.die(describeKnowledgeError(error)))
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
      .handle("getProfile", () =>
        userProfile.getProfile().pipe(
          Effect.catch((error) => Effect.die(error instanceof Error ? error : new Error(String(error))))
        )
      )
      .handle("saveProfile", ({ payload }) =>
        userProfile.saveProfile(payload).pipe(
          Effect.catch((error) => Effect.die(error instanceof Error ? error : new Error(String(error))))
        )
      )
      .handle("clearProfile", () =>
        userProfile.clearProfile().pipe(
          Effect.map(() => ({ success: true })),
          Effect.catch((error) => Effect.die(error instanceof Error ? error : new Error(String(error))))
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

