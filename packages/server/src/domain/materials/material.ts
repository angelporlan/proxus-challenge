import { Context, Data, Effect } from "effect";

export interface PdfMaterial {
  readonly id: string;
  readonly title: string;
  readonly fileName: string;
  readonly pageCount: number;
  readonly uploadedAt: string;
}

export interface PdfWord {
  readonly xMin: number;
  readonly yMin: number;
  readonly xMax: number;
  readonly yMax: number;
  readonly text: string;
}

export interface PdfLine {
  readonly xMin: number;
  readonly yMin: number;
  readonly xMax: number;
  readonly yMax: number;
  readonly text: string;
}

export interface PageDimensions {
  readonly width: number;
  readonly height: number;
}

export interface PageImage {
  readonly page: number;
  readonly mediaType: "image/png";
  readonly data: string;
  readonly dimensions?: PageDimensions | undefined;
  readonly words?: readonly PdfWord[] | undefined;
  readonly lines?: readonly PdfLine[] | undefined;
}

export interface MaterialPageImages {
  readonly type: "material-page-images";
  readonly material: PdfMaterial;
  readonly pages: readonly PageImage[];
}

export interface UploadMaterialPayload {
  readonly fileName: string;
  readonly content: Uint8Array;
  readonly title?: string | undefined;
}

export interface TextSearchResult {
  readonly page: number;
  readonly snippet: string;
  readonly score: number;
}

export class InvalidMaterialError extends Data.TaggedError("InvalidMaterialError")<{
  readonly reason: string;
}> {}

export class MaterialNotFound extends Data.TaggedError("MaterialNotFound")<{
  readonly materialId: string;
}> {}

export class InvalidPageRange extends Data.TaggedError("InvalidPageRange")<{
  readonly range: string;
  readonly reason: string;
}> {}

export class MaterialRepositoryError extends Data.TaggedError("MaterialRepositoryError")<{
  readonly reason: unknown;
}> {}

export interface MaterialRepository {
  readonly list: () => Effect.Effect<readonly PdfMaterial[], MaterialRepositoryError>;
  readonly get: (id: string) => Effect.Effect<PdfMaterial, MaterialNotFound | MaterialRepositoryError>;
  readonly upload: (
    payload: UploadMaterialPayload
  ) => Effect.Effect<PdfMaterial, InvalidMaterialError | MaterialRepositoryError>;
  readonly delete: (
    id: string
  ) => Effect.Effect<void, MaterialNotFound | MaterialRepositoryError>;
  readonly renderPages: (
    id: string,
    pages: readonly number[]
  ) => Effect.Effect<MaterialPageImages, MaterialNotFound | MaterialRepositoryError>;
  readonly getFilePath: (
    id: string
  ) => Effect.Effect<string, MaterialNotFound | MaterialRepositoryError>;
  readonly searchText: (
    id: string,
    query: string
  ) => Effect.Effect<readonly TextSearchResult[], MaterialNotFound | MaterialRepositoryError>;
}

export const MaterialRepository = Context.Service<MaterialRepository>(
  "@proxus/server/materials/MaterialRepository"
);

export const parsePageSelection = (
  selection: string
): Effect.Effect<readonly number[], InvalidPageRange> => Effect.gen(function* () {
  const pages = new Set<number>();
  const parts = selection.split(",").map((part) => part.trim()).filter((part) => part.length > 0);

  if (parts.length === 0) {
    return yield* new InvalidPageRange({ range: selection, reason: "Expected pages like 10 or 13-20" });
  }

  for (const part of parts) {
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (rangeMatch !== null) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) {
        return yield* new InvalidPageRange({ range: selection, reason: `Invalid range: ${part}` });
      }
      for (let page = start; page <= end; page++) {
        pages.add(page);
      }
      continue;
    }

    const page = Number(part);
    if (!Number.isSafeInteger(page) || page < 1) {
      return yield* new InvalidPageRange({ range: selection, reason: `Invalid page: ${part}` });
    }
    pages.add(page);
  }

  return [...pages].sort((a, b) => a - b);
});

export const isMaterialPageImages = (value: unknown): value is MaterialPageImages => {
  if (typeof value !== "object" || value === null || !("type" in value) || value.type !== "material-page-images") {
    return false;
  }

  const candidate = value as { readonly pages?: unknown };
  return Array.isArray(candidate.pages);
};
