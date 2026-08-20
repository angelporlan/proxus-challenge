import { Effect, FileSystem, Layer, Path } from "effect";
import { ChildProcess } from "effect/unstable/process";
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner";
import { PdfService, PdfServiceError, type PdfService as PdfServiceType } from "../../domain/materials/pdf-service.ts";

const make = (): Effect.Effect<PdfServiceType, PdfServiceError, ChildProcessSpawner | FileSystem.FileSystem | Path.Path> => Effect.gen(function* () {
  const spawner = yield* ChildProcessSpawner;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const assertExecutable = (command: string) => spawner.exitCode(
    ChildProcess.make(command, ["-v"])
  ).pipe(
    Effect.mapError((reason) => new PdfServiceError({
      reason: `Missing required Poppler command "${command}". Install Poppler so pdfinfo and pdftoppm are available on PATH. Cause: ${String(reason)}`
    })),
    Effect.flatMap((exitCode) => exitCode === 0
      ? Effect.void
      : Effect.fail(new PdfServiceError({
          reason: `Missing required Poppler command "${command}". Install Poppler so pdfinfo and pdftoppm are available on PATH. Exit code: ${exitCode}`
        }))
    )
  );

  yield* assertExecutable("pdfinfo");
  yield* assertExecutable("pdftoppm");
  yield* assertExecutable("pdftotext");

  const pageCount = (pdfPath: string) => spawner.string(
    ChildProcess.make("pdfinfo", [pdfPath])
  ).pipe(
    Effect.map((output) => {
      const match = /^Pages:\s+(\d+)$/m.exec(output);
      if (match === null) {
        throw new Error(`Could not read page count for ${pdfPath}`);
      }
      return Number(match[1]);
    }),
    Effect.mapError((reason) => new PdfServiceError({ reason }))
  );

  const extractWords = (filePath: string, pageNumber: number) =>
    spawner.string(
      ChildProcess.make("pdftotext", [
        "-f",
        String(pageNumber),
        "-l",
        String(pageNumber),
        "-bbox-layout",
        filePath,
        "-"
      ])
    ).pipe(
      Effect.map((output) => {
        const pageMatch = /<page\s+width="([\d.]+)"\s+height="([\d.]+)"/i.exec(output);
        const width = pageMatch?.[1] ? parseFloat(pageMatch[1]) : 595;
        const height = pageMatch?.[2] ? parseFloat(pageMatch[2]) : 842;

        const wordRegex = /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)">([^<]+)<\/word>/g;
        const words: { xMin: number; yMin: number; xMax: number; yMax: number; text: string }[] = [];
        let match: RegExpExecArray | null;
        while ((match = wordRegex.exec(output)) !== null) {
          if (match[1] && match[2] && match[3] && match[4] && match[5]) {
            words.push({
              xMin: parseFloat(match[1]),
              yMin: parseFloat(match[2]),
              xMax: parseFloat(match[3]),
              yMax: parseFloat(match[4]),
              text: match[5]
            });
          }
        }

        return {
          dimensions: { width, height },
          words
        };
      }),
      Effect.catch(() =>
        Effect.succeed({
          dimensions: { width: 595, height: 842 },
          words: []
        })
      )
    );

  const renderPage: PdfServiceType["renderPage"] = ({ path: pdfPath, page, dpi = 144 }) => Effect.gen(function* () {
    const tempDirectory = yield* fs.makeTempDirectory({ prefix: "proxus-material-" }).pipe(
      Effect.mapError((reason) => new PdfServiceError({ reason }))
    );
    const outputPrefix = path.join(tempDirectory, `page-${page}`);
    const imagePath = `${outputPrefix}.png`;

    yield* spawner.exitCode(
      ChildProcess.make("pdftoppm", [
        "-singlefile",
        "-f",
        String(page),
        "-l",
        String(page),
        "-r",
        String(dpi),
        "-png",
        pdfPath,
        outputPrefix
      ])
    ).pipe(
      Effect.mapError((reason) => new PdfServiceError({ reason }))
    );

    const [textData, bytes] = yield* Effect.all([
      extractWords(pdfPath, page),
      fs.readFile(imagePath).pipe(Effect.mapError((reason) => new PdfServiceError({ reason })))
    ]);

    yield* fs.remove(tempDirectory, { recursive: true, force: true }).pipe(
      Effect.catch(() => Effect.void)
    );

    return {
      page,
      mediaType: "image/png" as const,
      data: `data:image/png;base64,${uint8ArrayToBase64(bytes)}`,
      dimensions: textData.dimensions,
      words: textData.words
    };
  });

  return { pageCount, renderPage };
});

export const PopplerPdfService = {
  make,
  layer: Layer.effect(PdfService)(make())
};

const uint8ArrayToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};
