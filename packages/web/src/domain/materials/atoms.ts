import type { UploadMaterialInput } from "@proxus/shared";
import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { ApiClient } from "../../api-client/client.ts";
import { apiRuntime } from "../../lib/runtime.ts";

export const materialsQuery = apiRuntime
  .atom(
    ApiClient.use((client) =>
      client.materials.list()
    ).pipe(Effect.withSpan("materials.list", { kind: "client" }))
  )
  .pipe(Atom.keepAlive, Atom.withReactivity(["materials"]));

export const materialQuery = Atom.family((id: string) =>
  apiRuntime
    .atom(
      ApiClient.use((client) =>
        client.materials.get({ params: { id } })
      ).pipe(Effect.withSpan("materials.get", { kind: "client" }))
    )
    .pipe(Atom.keepAlive, Atom.withReactivity({ materials: [id] }))
);

export const materialMindMapQuery = Atom.family((id: string) =>
  apiRuntime
    .atom(
      ApiClient.use((client) =>
        client.materials.getMindMap({ params: { id } })
      ).pipe(Effect.withSpan("materials.getMindMap", { kind: "client" }))
    )
    .pipe(Atom.keepAlive, Atom.withReactivity(["materials", id, "mindmap"]))
);

export const uploadMaterialAction = apiRuntime.fn(
  (input: UploadMaterialInput) =>
    ApiClient.use((client) =>
      client.materials.upload({
        payload: input
      })
    ).pipe(Effect.withSpan("materials.upload", { kind: "client" })),
  { reactivityKeys: ["materials"] }
);

export const deleteMaterialAction = apiRuntime.fn(
  (id: string) =>
    ApiClient.use((client) =>
      client.materials.delete({
        params: { id }
      })
    ).pipe(Effect.withSpan("materials.delete", { kind: "client" })),
  { reactivityKeys: ["materials"] }
);

export const generateMaterialMindMapAction = apiRuntime.fn(
  (id: string) =>
    ApiClient.use((client) =>
      client.materials.generateMindMap({ params: { id } })
    ).pipe(Effect.withSpan("materials.generateMindMap", { kind: "client" })),
  { reactivityKeys: ["materials"] }
);

export const renderMaterialPagesAction = apiRuntime.fn(
  (input: { readonly id: string; readonly pages: readonly number[] }) =>
    ApiClient.use((client) =>
      client.materials.renderPages({
        params: { id: input.id },
        payload: { pages: input.pages as number[] }
      })
    ).pipe(Effect.withSpan("materials.renderPages", { kind: "client" }))
);
