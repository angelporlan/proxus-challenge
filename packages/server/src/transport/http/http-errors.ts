import { Effect } from "effect";
import { InvalidRequest, ResourceNotFound } from "@proxus/shared";

const isTagged = (error: unknown): error is { readonly _tag: string } & Record<string, unknown> =>
  typeof error === "object" && error !== null && "_tag" in error;

export const mapDomainErrorToHttp = (error: unknown): ResourceNotFound | InvalidRequest | undefined => {
  if (!isTagged(error)) return undefined;

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
    default:
      return undefined;
  }
};

export const failAsHttpError = (error: unknown): Effect.Effect<never, ResourceNotFound | InvalidRequest> => {
  const mapped = mapDomainErrorToHttp(error);
  return mapped ? Effect.fail(mapped) : Effect.die(error instanceof Error ? error : new Error(String(error)));
};
