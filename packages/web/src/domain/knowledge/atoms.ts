import type { KnowledgeGapStatus } from "@proxus/shared";
import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { ApiClient } from "../../api-client/client.ts";
import { apiRuntime } from "../../lib/runtime.ts";

export const knowledgeProfileQuery = apiRuntime
  .atom(
    ApiClient.use((client) =>
      client.knowledge.getProfile()
    ).pipe(Effect.withSpan("knowledge.getProfile", { kind: "client" }))
  )
  .pipe(Atom.keepAlive, Atom.withReactivity(["knowledge"]));

export const updateGapStatusAction = apiRuntime.fn(
  (input: { readonly id: string; readonly status: KnowledgeGapStatus }) =>
    ApiClient.use((client) =>
      client.knowledge.updateGapStatus({
        params: { id: input.id },
        payload: { status: input.status }
      })
    ).pipe(Effect.withSpan("knowledge.updateGapStatus", { kind: "client" })),
  { reactivityKeys: ["knowledge"] }
);

export const clearKnowledgeProfileAction = apiRuntime.fn(
  () =>
    ApiClient.use((client) =>
      client.knowledge.clearProfile()
    ).pipe(Effect.withSpan("knowledge.clearProfile", { kind: "client" })),
  { reactivityKeys: ["knowledge"] }
);
