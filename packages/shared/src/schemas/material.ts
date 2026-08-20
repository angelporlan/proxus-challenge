import { Schema } from "effect";

export const PdfMaterial = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  fileName: Schema.String,
  pageCount: Schema.Number,
  uploadedAt: Schema.String
});
export type PdfMaterial = typeof PdfMaterial.Type;

export const PdfWord = Schema.Struct({
  xMin: Schema.Number,
  yMin: Schema.Number,
  xMax: Schema.Number,
  yMax: Schema.Number,
  text: Schema.String
});
export type PdfWord = typeof PdfWord.Type;

export const PageDimensions = Schema.Struct({
  width: Schema.Number,
  height: Schema.Number
});
export type PageDimensions = typeof PageDimensions.Type;

export const PageImage = Schema.Struct({
  page: Schema.Number,
  mediaType: Schema.Literal("image/png"),
  data: Schema.String,
  dimensions: Schema.optional(PageDimensions),
  words: Schema.optional(Schema.Array(PdfWord))
});
export type PageImage = typeof PageImage.Type;

export const MaterialPageImages = Schema.Struct({
  type: Schema.Literal("material-page-images"),
  material: PdfMaterial,
  pages: Schema.Array(PageImage)
});
export type MaterialPageImages = typeof MaterialPageImages.Type;

export const MaterialListResponse = Schema.Struct({
  materials: Schema.Array(PdfMaterial)
});
export type MaterialListResponse = typeof MaterialListResponse.Type;

export const UploadMaterialInput = Schema.Struct({
  fileName: Schema.String,
  contentBase64: Schema.String,
  title: Schema.optional(Schema.String)
});
export type UploadMaterialInput = typeof UploadMaterialInput.Type;

export const DeleteMaterialResponse = Schema.Struct({
  success: Schema.Boolean,
  id: Schema.String
});
export type DeleteMaterialResponse = typeof DeleteMaterialResponse.Type;

export const RenderPagesInput = Schema.Struct({
  pages: Schema.Array(Schema.Number)
});
export type RenderPagesInput = typeof RenderPagesInput.Type;

