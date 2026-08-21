import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { Artifact, ArtifactAttempt, ArtifactListResponse, SubmitAttemptInput } from "../schemas/artifact.ts";
import { InvalidRequest, ResourceNotFound } from "../schemas/http-error.ts";

const ArtifactKindQuery = Schema.Struct({
  kind: Schema.optional(Schema.Union([
    Schema.Literal("note"),
    Schema.Literal("quiz"),
    Schema.Literal("test")
  ]))
});

const ClientHttpErrors = [ResourceNotFound, InvalidRequest] as const;

export class ArtifactsApi extends HttpApiGroup.make("artifacts")
  .add(
    HttpApiEndpoint.get("list", "/", {
      query: ArtifactKindQuery,
      success: ArtifactListResponse
    }),
    HttpApiEndpoint.get("get", "/:id", {
      params: {
        id: Schema.String
      },
      success: Artifact,
      error: ClientHttpErrors
    }),
    HttpApiEndpoint.post("submit", "/:id/submit", {
      params: {
        id: Schema.String
      },
      payload: SubmitAttemptInput,
      success: ArtifactAttempt,
      error: ClientHttpErrors
    }),
    HttpApiEndpoint.delete("delete", "/:id", {
      params: {
        id: Schema.String
      },
      success: Schema.Struct({
        success: Schema.Boolean,
        id: Schema.String
      }),
      error: ClientHttpErrors
    })
  )
  .prefix("/artifacts")
{}
