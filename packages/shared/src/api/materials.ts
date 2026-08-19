import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import {
  DeleteMaterialResponse,
  MaterialListResponse,
  PdfMaterial,
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
    HttpApiEndpoint.delete("delete", "/:id", {
      params: {
        id: Schema.String
      },
      success: DeleteMaterialResponse
    })
  )
  .prefix("/materials")
{}

