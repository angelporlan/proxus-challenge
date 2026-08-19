import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import {
  DeleteMaterialResponse,
  MaterialListResponse,
  MaterialPageImages,
  PdfMaterial,
  RenderPagesInput,
  UploadMaterialInput
} from "../schemas/material.ts";

export class MaterialsApi extends HttpApiGroup.make("materials")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: MaterialListResponse
    }),
    HttpApiEndpoint.get("get", "/:id", {
      params: {
        id: Schema.String
      },
      success: PdfMaterial
    }),
    HttpApiEndpoint.post("upload", "/upload", {
      payload: UploadMaterialInput,
      success: PdfMaterial
    }),
    HttpApiEndpoint.post("renderPages", "/:id/pages", {
      params: {
        id: Schema.String
      },
      payload: RenderPagesInput,
      success: MaterialPageImages
    }),
    HttpApiEndpoint.delete("delete", "/:id", {
      params: {
        id: Schema.String
      },
      success: DeleteMaterialResponse
    })
  )
  .prefix("/materials")
{}

