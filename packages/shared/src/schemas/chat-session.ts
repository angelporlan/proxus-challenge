import { Schema } from "effect";
import { AgentMessage } from "./agent-message.ts";

export const ChatSession = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  messages: Schema.Array(AgentMessage),
  mode: Schema.optional(Schema.Union([
    Schema.Literal("socratic"),
    Schema.Literal("explanatory")
  ])),
  createdAt: Schema.String,
  updatedAt: Schema.String
});
export type ChatSession = typeof ChatSession.Type;
