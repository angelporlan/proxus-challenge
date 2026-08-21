import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { InvalidRequest, ResourceNotFound } from "../schemas/http-error.ts";
import {
  DeleteMaterialResponse,
  MaterialListResponse,
  MaterialPageImages,
  PdfMaterial,
  RenderPagesInput,
  UploadMaterialInput
} from "../schemas/material.ts";

const ClientHttpErrors = [ResourceNotFound, InvalidRequest] as const;

export class MaterialsApi extends HttpApiGroup.make("materials")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: MaterialListResponse
    }),
    HttpApiEndpoint.get("get", "/:id", {
      params: {
        id: Schema.String
      },
      success: PdfMaterial,
      error: ClientHttpErrors
    }),
    HttpApiEndpoint.post("upload", "/upload", {
      payload: UploadMaterialInput,
      success: PdfMaterial,
      error: ClientHttpErrors
    }),
    HttpApiEndpoint.post("renderPages", "/:id/pages", {
      params: {
        id: Schema.String
      },
      payload: RenderPagesInput,
      success: MaterialPageImages,
      error: ClientHttpErrors
    }),
    HttpApiEndpoint.delete("delete", "/:id", {
      params: {
        id: Schema.String
      },
      success: DeleteMaterialResponse,
      error: ClientHttpErrors
    })
  )
  .prefix("/materials")
{}
