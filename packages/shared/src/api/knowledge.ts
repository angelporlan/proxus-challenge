import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { KnowledgeGap, KnowledgeProfile, UpdateGapStatusInput } from "../schemas/knowledge.ts";

export class KnowledgeApi extends HttpApiGroup.make("knowledge")
  .add(
    HttpApiEndpoint.get("getProfile", "/profile", {
      success: KnowledgeProfile
    }),
    HttpApiEndpoint.post("updateGapStatus", "/gaps/:id/status", {
      params: {
        id: Schema.String
      },
      payload: UpdateGapStatusInput,
      success: KnowledgeGap
    }),
    HttpApiEndpoint.delete("clearProfile", "/profile", {
      success: Schema.Struct({
        success: Schema.Boolean
      })
    })
  )
  .prefix("/knowledge")
{}
