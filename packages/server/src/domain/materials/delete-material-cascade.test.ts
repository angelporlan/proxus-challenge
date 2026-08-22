import { beforeEach, describe, expect, it } from "vitest";
import { Effect, Layer, Path } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { PdfService } from "./pdf-service.ts";
import { MaterialRepository } from "./material.ts";
import { ArtifactRepository } from "../artifacts/artifact.ts";
import { KnowledgeRepository } from "../knowledge/knowledge-profile.ts";
import { FileMaterialRepository } from "../../infra/materials/file-material-repository.ts";
import { FileArtifactRepository } from "../../infra/artifacts/file-artifact-repository.ts";
import { FileKnowledgeRepository } from "../../infra/knowledge/file-knowledge-repository.ts";
import { deleteMaterialCascade } from "./delete-material-cascade.ts";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

describe("deleteMaterialCascade", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxus-cascade-test-"));
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

  it("deletes related artifacts and knowledge gaps with the PDF", async () => {
    const knowledgeLayer = FileKnowledgeRepository.layer(path.join(tempDir, "knowledge"));
    const artifactsLayer = FileArtifactRepository.layer(path.join(tempDir, "artifacts")).pipe(
      Layer.provideMerge(knowledgeLayer),
      Layer.provideMerge(Layer.mergeAll(NodeFileSystem.layer, Path.layer))
    );
    const materialsLayer = FileMaterialRepository.layer(path.join(tempDir, "pdfs")).pipe(
      Layer.provideMerge(Layer.mergeAll(
        NodeFileSystem.layer,
        Path.layer,
        Layer.succeed(PdfService, pdfService)
      ))
    );

    const result = await Effect.gen(function* () {
      const materials = yield* MaterialRepository;
      const artifacts = yield* ArtifactRepository;
      const knowledge = yield* KnowledgeRepository;

      const material = yield* materials.upload({
        fileName: "temario.pdf",
        content: new Uint8Array([0x25, 0x50, 0x44, 0x46])
      });
      const quiz = yield* artifacts.createArtifact({
        kind: "quiz",
        title: "Quiz del temario",
        sourceMaterialId: material.id,
        questions: []
      });
      yield* knowledge.recordGaps([{
        id: "gap-1",
        conceptId: "c1",
        topic: "Tema",
        question: "Pregunta",
        studentAnswer: "Mal",
        correctAnswer: "Bien",
        explanation: "Porque",
        status: "active",
        failedAt: new Date().toISOString(),
        sourceArtifactId: quiz.id,
        sourceQuestionId: "q1",
        sourceMaterialId: material.id
      }]);

      yield* deleteMaterialCascade(material.id);

      const remainingArtifacts = yield* artifacts.listArtifacts({});
      const profile = yield* knowledge.getProfile();
      return { remainingArtifacts, profile, materialId: material.id };
    }).pipe(
      Effect.provide(Layer.mergeAll(materialsLayer, artifactsLayer)),
      Effect.runPromise
    );

    expect(result.remainingArtifacts).toEqual([]);
    expect(result.profile.gaps).toEqual([]);
    expect(fs.existsSync(path.join(tempDir, "pdfs", `${result.materialId}.pdf`))).toBe(false);
  });
});
