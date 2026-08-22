import { beforeEach, describe, expect, it } from "vitest";
import { Effect, Layer, Path } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import type { MindMapNode } from "@proxus/shared";
import { PdfService } from "../../domain/materials/pdf-service.ts";
import { FileMaterialRepository } from "./file-material-repository.ts";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

describe("FileMaterialRepository mind maps", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxus-materials-test-"));
    return () => fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const pdfService = PdfService.of({
    pageCount: () => Effect.succeed(1),
    renderPage: () => Effect.succeed({
      page: 1,
      mediaType: "image/png" as const,
      data: ""
    }),
    extractDocumentText: () => Effect.succeed([{ page: 1, text: "Contenido de prueba" }])
  });

  const runWithRepo = <A, E>(fn: (repo: ReturnType<typeof FileMaterialRepository.make> extends Effect.Effect<infer R, any, any> ? R : never) => Effect.Effect<A, E>) =>
    Effect.gen(function* () {
      const repo = yield* FileMaterialRepository.make(tempDir);
      return yield* fn(repo);
    }).pipe(
      Effect.provide(Layer.mergeAll(NodeFileSystem.layer, Path.layer, Layer.succeed(PdfService, pdfService))),
      Effect.runPromise
    );

  const mindMap: MindMapNode = {
    id: "root",
    label: "Documento de prueba",
    notes: "Resumen",
    page: 1,
    color: "#6366f1",
    icon: "menu_book",
    children: [{ id: "child", label: "Concepto", children: [] }]
  };

  it("persists and reads the mind map independently from the PDF", async () => {
    const material = await runWithRepo((repo) => repo.upload({
      fileName: "documento.pdf",
      content: new Uint8Array([0x25, 0x50, 0x44, 0x46])
    }));

    await runWithRepo((repo) => repo.saveMindMap(material.id, mindMap));
    await expect(runWithRepo((repo) => repo.getMindMap(material.id))).resolves.toEqual(mindMap);
  });

  it("removes the persisted mind map when its PDF is deleted", async () => {
    const material = await runWithRepo((repo) => repo.upload({
      fileName: "documento.pdf",
      content: new Uint8Array([0x25, 0x50, 0x44, 0x46])
    }));

    await runWithRepo((repo) => repo.saveMindMap(material.id, mindMap));
    await runWithRepo((repo) => repo.delete(material.id));

    expect(fs.existsSync(path.join(tempDir, "documento.mindmap.json"))).toBe(false);
  });
});
