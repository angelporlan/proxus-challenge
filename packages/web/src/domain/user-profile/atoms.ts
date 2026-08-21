import type { UpdateUserProfileInput } from "@proxus/shared";
import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { ApiClient } from "../../api-client/client.ts";
import { apiRuntime } from "../../lib/runtime.ts";

export const userProfileQuery = apiRuntime
  .atom(
    ApiClient.use((client) =>
      client.userProfile.getProfile()
    ).pipe(Effect.withSpan("userProfile.getProfile", { kind: "client" }))
  )
  .pipe(Atom.keepAlive, Atom.withReactivity(["userProfile"]));

export const saveUserProfileAction = apiRuntime.fn(
  (input: UpdateUserProfileInput) =>
    ApiClient.use((client) =>
      client.userProfile.saveProfile({
        payload: input
      })
    ).pipe(Effect.withSpan("userProfile.saveProfile", { kind: "client" })),
  { reactivityKeys: ["userProfile"] }
);

export const clearUserProfileAction = apiRuntime.fn(
  () =>
    ApiClient.use((client) =>
      client.userProfile.clearProfile()
    ).pipe(Effect.withSpan("userProfile.clearProfile", { kind: "client" })),
  { reactivityKeys: ["userProfile"] }
);
