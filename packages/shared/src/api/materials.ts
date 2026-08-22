import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { ResourceHttpErrors, ServiceHttpErrors } from "../schemas/http-error.ts";
import {
  DeleteMaterialResponse,
  MaterialListResponse,
  MaterialPageImages,
  MindMapResponse,
  PdfMaterial,
  RenderPagesInput,
  UploadMaterialInput
} from "../schemas/material.ts";

export class MaterialsApi extends HttpApiGroup.make("materials")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: MaterialListResponse,
      error: ServiceHttpErrors
    }),
    HttpApiEndpoint.get("get", "/:id", {
      params: {
        id: Schema.String
      },
      success: PdfMaterial,
      error: ResourceHttpErrors
    }),
    HttpApiEndpoint.post("upload", "/upload", {
      payload: UploadMaterialInput,
      success: PdfMaterial,
      error: ResourceHttpErrors
    }),
    HttpApiEndpoint.post("renderPages", "/:id/pages", {
      params: {
        id: Schema.String
      },
      payload: RenderPagesInput,
      success: MaterialPageImages,
      error: ResourceHttpErrors
    }),
    HttpApiEndpoint.get("getMindMap", "/:id/mindmap", {
      params: {
        id: Schema.String
      },
      success: MindMapResponse,
      error: ResourceHttpErrors
    }),
    HttpApiEndpoint.post("generateMindMap", "/:id/mindmap/generate", {
      params: {
        id: Schema.String
      },
      success: MindMapResponse,
      error: ResourceHttpErrors
    }),
    HttpApiEndpoint.delete("delete", "/:id", {
      params: {
        id: Schema.String
      },
      success: DeleteMaterialResponse,
      error: ResourceHttpErrors
    })
  )
  .prefix("/materials")
{}
