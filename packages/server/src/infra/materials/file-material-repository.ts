import { Effect, FileSystem, Layer, Option, Path } from "effect";
import {
  InvalidMaterialError,
  MaterialNotFound,
  MaterialRepository,
  MaterialRepositoryError,
  type MaterialPageImages,
  type MaterialRepository as MaterialRepositoryType,
  type PdfMaterial,
  type TextSearchResult,
  type UploadMaterialPayload
} from "../../domain/materials/material.ts";
import { PdfService } from "../../domain/materials/pdf-service.ts";

interface PdfFile {
  readonly material: PdfMaterial;
  readonly path: string;
}

export const FileMaterialRepository = {
  make: (directory: string): Effect.Effect<MaterialRepositoryType, never, FileSystem.FileSystem | Path.Path | PdfService> => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const pdf = yield* PdfService;
    const mapError = (reason: unknown) => new MaterialRepositoryError({ reason });

    const pdfPath = (fileName: string) => path.join(directory, fileName);
    const metaPath = (fileName: string) =>
      path.join(directory, `${path.basename(fileName, ".pdf")}.meta.json`);

    const sanitizeFileName = (rawName: string) => {
      const base = path.basename(rawName).trim();
      const withoutExt = path.basename(base, path.extname(base)).replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const cleanBase = withoutExt.length > 0 ? withoutExt : "document";
      return `${cleanBase}.pdf`;
    };

    const hasPdfHeader = (bytes: Uint8Array) => {
      if (bytes.length < 4) return false;
      return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    };

    const parseTitleFromMetaJson = (content: string): string | undefined => {
      try {
        const parsed = JSON.parse(content);
        return typeof parsed?.title === "string" && parsed.title.trim().length > 0
          ? parsed.title.trim()
          : undefined;
      } catch {
        return undefined;
      }
    };

    const listFiles = (): Effect.Effect<readonly PdfFile[], MaterialRepositoryError> => Effect.gen(function* () {
      yield* fs.makeDirectory(directory, { recursive: true }).pipe(
        Effect.mapError(mapError)
      );

      const entries = yield* fs.readDirectory(directory).pipe(
        Effect.mapError(mapError)
      );

      return yield* Effect.forEach(
        entries.filter((entry) => path.extname(entry).toLowerCase() === ".pdf").sort(),
        (fileName): Effect.Effect<PdfFile, MaterialRepositoryError> => Effect.gen(function* () {
          const fullPath = pdfPath(fileName);
          const metaFilePath = metaPath(fileName);
          const stat = yield* fs.stat(fullPath).pipe(
            Effect.mapError(mapError)
          );
          const materialId = path.basename(fileName, ".pdf");

          let title = materialId;
          const metaExists = yield* fs.exists(metaFilePath).pipe(Effect.mapError(mapError));
          if (metaExists) {
            const metaContent = yield* fs.readFileString(metaFilePath).pipe(Effect.catch(() => Effect.succeed("")));
            const parsedTitle = parseTitleFromMetaJson(metaContent);
            if (parsedTitle !== undefined) {
              title = parsedTitle;
            }
          }

          const material: PdfMaterial = {
            id: materialId,
            title,
            fileName,
            pageCount: yield* pdf.pageCount(fullPath).pipe(Effect.mapError(mapError)),
            uploadedAt: Option.getOrElse(stat.mtime, () => new Date(0)).toISOString()
          };
          return { material, path: fullPath };
        }),
        { concurrency: 1 }
      );
    });

    const getFile = (id: string): Effect.Effect<PdfFile, MaterialNotFound | MaterialRepositoryError> => Effect.gen(function* () {
      const files = yield* listFiles();
      const found = files.find((file) => file.material.id === id);
      if (found === undefined) {
        return yield* new MaterialNotFound({ materialId: id });
      }
      return found;
    });

    const list = () => listFiles().pipe(
      Effect.map((files) => files.map((file) => file.material))
    );

    const get = (id: string) => getFile(id).pipe(
      Effect.map((file) => file.material)
    );

    const upload = (
      payload: UploadMaterialPayload
    ): Effect.Effect<PdfMaterial, InvalidMaterialError | MaterialRepositoryError> => Effect.gen(function* () {
      if (!hasPdfHeader(payload.content)) {
        return yield* new InvalidMaterialError({
          reason: "The uploaded file does not appear to be a valid PDF (missing PDF header magic bytes)."
        });
      }

      yield* fs.makeDirectory(directory, { recursive: true }).pipe(
        Effect.mapError(mapError)
      );

      const fileName = sanitizeFileName(payload.fileName);
      const fullPath = pdfPath(fileName);
      const metaFilePath = metaPath(fileName);

      yield* fs.writeFile(fullPath, payload.content).pipe(
        Effect.mapError(mapError)
      );

      const pageCountResult = yield* pdf.pageCount(fullPath).pipe(
        Effect.map((count) => ({ ok: true as const, count })),
        Effect.catch((err) =>
          fs.remove(fullPath, { force: true }).pipe(
            Effect.catch(() => Effect.void),
            Effect.as({ ok: false as const, error: String(err) })
          )
        )
      );

      if (!pageCountResult.ok) {
        return yield* new InvalidMaterialError({
          reason: `Uploaded PDF is corrupted or cannot be processed: ${pageCountResult.error}`
        });
      }

      const stat = yield* fs.stat(fullPath).pipe(Effect.mapError(mapError));
      const materialId = path.basename(fileName, ".pdf");

      let title = materialId;
      if (payload.title !== undefined && payload.title.trim().length > 0) {
        title = payload.title.trim();
        yield* fs.writeFileString(metaFilePath, JSON.stringify({ title }, null, 2)).pipe(
          Effect.mapError(mapError)
        );
      }

      return {
        id: materialId,
        title,
        fileName,
        pageCount: pageCountResult.count,
        uploadedAt: Option.getOrElse(stat.mtime, () => new Date()).toISOString()
      };
    });

    const remove = (id: string): Effect.Effect<void, MaterialNotFound | MaterialRepositoryError> => Effect.gen(function* () {
      const file = yield* getFile(id);
      yield* fs.remove(file.path, { force: true }).pipe(
        Effect.mapError(mapError)
      );
      const metaFilePath = metaPath(file.material.fileName);
      yield* fs.remove(metaFilePath, { force: true }).pipe(
        Effect.catch(() => Effect.void)
      );
    });

    const renderPages = (
      id: string,
      pages: readonly number[]
    ): Effect.Effect<MaterialPageImages, MaterialNotFound | MaterialRepositoryError> => Effect.gen(function* () {
      const file = yield* getFile(id);
      const invalidPage = pages.find((page) => page < 1 || page > file.material.pageCount);
      if (invalidPage !== undefined) {
        return yield* new MaterialRepositoryError({
          reason: `Page ${invalidPage} is outside 1-${file.material.pageCount} for material ${id}`
        });
      }

      const images = yield* Effect.forEach(pages, (page) => pdf.renderPage({ path: file.path, page }).pipe(
        Effect.mapError(mapError)
      ), { concurrency: 1 });

      return {
        type: "material-page-images" as const,
        material: file.material,
        pages: images
      };
    });

    const getFilePath = (id: string): Effect.Effect<string, MaterialNotFound | MaterialRepositoryError> =>
      getFile(id).pipe(Effect.map((file) => file.path));

    const searchText = (id: string, query: string): Effect.Effect<readonly TextSearchResult[], MaterialNotFound | MaterialRepositoryError> => Effect.gen(function* () {
      const file = yield* getFile(id);
      const pages = yield* pdf.extractDocumentText(file.path).pipe(Effect.mapError(mapError));
      const cleanQuery = query.trim().toLowerCase();
      if (cleanQuery.length === 0) {
        return [];
      }

      const queryTerms = cleanQuery.split(/\s+/).filter((t) => t.length > 0);
      const results: TextSearchResult[] = [];

      for (const item of pages) {
        const lowerText = item.text.toLowerCase();
        let matchCount = 0;
        let firstIndex = -1;

        for (const term of queryTerms) {
          let idx = lowerText.indexOf(term);
          while (idx !== -1) {
            matchCount++;
            if (firstIndex === -1 || idx < firstIndex) {
              firstIndex = idx;
            }
            idx = lowerText.indexOf(term, idx + term.length);
          }
        }

        if (matchCount > 0 && firstIndex !== -1) {
          const start = Math.max(0, firstIndex - 60);
          const end = Math.min(item.text.length, firstIndex + 140);
          let snippet = item.text.slice(start, end).replace(/\s+/g, " ").trim();
          if (start > 0) snippet = `...${snippet}`;
          if (end < item.text.length) snippet = `${snippet}...`;

          results.push({
            page: item.page,
            snippet,
            score: matchCount
          });
        }
      }

      return results.sort((a, b) => b.score - a.score);
    });

    return { list, get, upload, delete: remove, renderPages, getFilePath, searchText };
  }),
  layer: (directory: string) => Layer.effect(MaterialRepository)(FileMaterialRepository.make(directory))
};
