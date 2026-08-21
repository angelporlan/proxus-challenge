import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { AgentMessage } from "../schemas/agent-message.ts";
import { TutorHttpErrors } from "../schemas/http-error.ts";

export const TutorChatRequest = Schema.Struct({
  messages: Schema.Array(AgentMessage),
  input: Schema.String,
  mode: Schema.optional(Schema.Union([
    Schema.Literal("socratic"),
    Schema.Literal("explanatory")
  ])),
  activeMaterialIds: Schema.optional(Schema.Array(Schema.String)),
  documentReferences: Schema.optional(Schema.Array(Schema.String)),
  maxSteps: Schema.optional(Schema.Number)
});
export type TutorChatRequest = typeof TutorChatRequest.Type;

export const TutorChatResponse = Schema.Struct({
  output: Schema.String,
  newMessages: Schema.Array(AgentMessage),
  messages: Schema.Array(AgentMessage)
});
export type TutorChatResponse = typeof TutorChatResponse.Type;

export const TutorChatStreamEvent = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("message"),
    message: AgentMessage
  }),
  Schema.Struct({
    type: Schema.Literal("done")
  })
]);
export type TutorChatStreamEvent = typeof TutorChatStreamEvent.Type;

export class TutorApi extends HttpApiGroup.make("tutor")
  .add(HttpApiEndpoint.post("chat", "/chat", {
    payload: TutorChatRequest,
    success: TutorChatResponse,
    error: TutorHttpErrors
  }))
  .prefix("/tutor")
{}
