import { Effect } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import {
  InvalidRequest,
  ResourceNotFound,
  ServiceFailure,
  TutorUnavailable,
  type ClientHttpError
} from "@proxus/shared";

const isTagged = (error: unknown): error is { readonly _tag: string } & Record<string, unknown> =>
  typeof error === "object" && error !== null && "_tag" in error;

const AI_FAILURE_TAGS = new Set([
  "AiError",
  "NetworkError",
  "HttpError",
  "RateLimitError",
  "AuthenticationError",
  "ContentPolicyError",
  "UnknownError",
  "GeminiConfigError"
]);

const REPOSITORY_FAILURE_TAGS = new Set([
  "MaterialRepositoryError",
  "ArtifactRepositoryStorageError",
  "KnowledgeRepositoryError",
  "UserProfileRepositoryError",
  "PdfServiceError"
]);

export const httpStatusForError = (error: ClientHttpError): number => {
  switch (error._tag) {
    case "ResourceNotFound":
      return 404;
    case "InvalidRequest":
      return 400;
    case "TutorUnavailable":
      return 503;
    case "ServiceFailure":
      return 500;
  }
};

export const mapDomainErrorToHttp = (error: unknown): ClientHttpError => {
  if (isTagged(error)) {
    switch (error._tag) {
      case "MaterialNotFound":
        return new ResourceNotFound({ message: `Material not found: ${String(error.materialId ?? "unknown")}` });
      case "ArtifactNotFound":
        return new ResourceNotFound({ message: `Artifact not found: ${String(error.artifactId ?? "unknown")}` });
      case "AttemptNotFound":
        return new ResourceNotFound({ message: `Attempt not found: ${String(error.attemptId ?? "unknown")}` });
      case "GapNotFound":
        return new ResourceNotFound({ message: `Knowledge gap not found: ${String(error.gapId ?? "unknown")}` });
      case "InvalidPageRange":
        return new InvalidRequest({ message: `Invalid page range: ${String(error.reason ?? "")}` });
      case "InvalidMaterialError":
        return new InvalidRequest({ message: `Invalid material: ${String(error.reason ?? "")}` });
      case "ArtifactTypeMismatch":
        return new InvalidRequest({
          message: `Artifact type mismatch: expected ${String(error.expected ?? "")}, got ${String(error.actual ?? "")}`
        });
      case "QuestionNotFound":
        return new InvalidRequest({ message: `Question not found: ${String(error.questionId ?? "unknown")}` });
      case "AnswerTypeMismatch":
        return new InvalidRequest({
          message: `Answer type mismatch for question ${String(error.questionId ?? "unknown")}`
        });
      case "ArtifactRepositorySerializationError":
        return new InvalidRequest({ message: `Invalid artifact data: ${String(error.reason ?? "")}` });
      case "SchemaError":
      case "HttpApiSchemaError":
        return new InvalidRequest({ message: "Invalid request body" });
      default:
        if (AI_FAILURE_TAGS.has(error._tag)) {
          return new TutorUnavailable({
            message: String(error.description ?? error.reason ?? error.message ?? "Tutor model unavailable")
          });
        }
        if (REPOSITORY_FAILURE_TAGS.has(error._tag)) {
          return new ServiceFailure({
            message: String(error.reason ?? error.message ?? "Storage operation failed")
          });
        }
    }
  }

  return new ServiceFailure({
    message: error instanceof Error ? error.message : String(error)
  });
};

export const failAsHttpError = (
  error: unknown
): Effect.Effect<never, ResourceNotFound | InvalidRequest | ServiceFailure> => {
  const mapped = mapDomainErrorToHttp(error);
  if (mapped._tag === "TutorUnavailable") {
    return Effect.fail(new ServiceFailure({ message: mapped.message }));
  }
  return Effect.fail(mapped);
};

export const failAsTutorHttpError = (
  error: unknown
): Effect.Effect<never, InvalidRequest | TutorUnavailable | ServiceFailure> => {
  const mapped = mapDomainErrorToHttp(error);
  if (mapped._tag === "ResourceNotFound") {
    return Effect.fail(new InvalidRequest({ message: mapped.message }));
  }
  return Effect.fail(mapped);
};

export const failAsServiceHttpError = (error: unknown): Effect.Effect<never, ServiceFailure> => {
  const mapped = mapDomainErrorToHttp(error);
  return Effect.fail(mapped._tag === "ServiceFailure" ? mapped : new ServiceFailure({ message: mapped.message }));
};

export const httpErrorResponse = (error: unknown): HttpServerResponse.HttpServerResponse => {
  const mapped = mapDomainErrorToHttp(error);
  return HttpServerResponse.jsonUnsafe(
    { _tag: mapped._tag, message: mapped.message },
    { status: httpStatusForError(mapped) }
  );
};
