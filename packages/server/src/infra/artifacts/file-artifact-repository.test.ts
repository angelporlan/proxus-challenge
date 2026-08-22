import { beforeEach, describe, expect, it } from "vitest";
import { Effect, Layer, Path } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import type { KnowledgeGap } from "@proxus/shared";
import { ArtifactRepository } from "../../domain/artifacts/artifact.ts";
import { KnowledgeRepository } from "../../domain/knowledge/knowledge-profile.ts";
import { FileArtifactRepository } from "./file-artifact-repository.ts";
import { FileKnowledgeRepository } from "../knowledge/file-knowledge-repository.ts";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

describe("FileArtifactRepository", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxus-artifacts-test-"));
    return () => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    };
  });

  const runWithRepositories = <A, E>(
    fn: (artifacts: ArtifactRepository, knowledge: KnowledgeRepository) => Effect.Effect<A, E>
  ) => {
    const knowledgeLayer = FileKnowledgeRepository.layer(path.join(tempDir, "knowledge"));
    const artifactsLayer = FileArtifactRepository.layer(path.join(tempDir, "artifacts")).pipe(
      Layer.provideMerge(knowledgeLayer),
      Layer.provideMerge(Layer.mergeAll(NodeFileSystem.layer, Path.layer))
    );

    return Effect.gen(function* () {
      const artifacts = yield* ArtifactRepository;
      const knowledge = yield* KnowledgeRepository;
      return yield* fn(artifacts, knowledge);
    }).pipe(
      Effect.provide(artifactsLayer),
      Effect.runPromise
    );
  };

  const makeGap = (sourceArtifactId: string): KnowledgeGap => ({
    id: `gap-${sourceArtifactId}`,
    conceptId: "concept-1",
    topic: "Tema de prueba",
    question: "Pregunta de prueba",
    studentAnswer: "Respuesta incorrecta",
    correctAnswer: "Respuesta correcta",
    explanation: "Explicación",
    status: "active",
    failedAt: new Date().toISOString(),
    sourceArtifactId,
    sourceQuestionId: "question-1"
  });

  it.each(["quiz", "test"] as const)("deletes knowledge gaps when deleting a %s", async (kind) => {
    const profile = await runWithRepositories((artifacts, knowledge) => Effect.gen(function* () {
      const artifact = kind === "quiz"
        ? yield* artifacts.createArtifact({ kind: "quiz", title: "Quiz", questions: [] })
        : yield* artifacts.createArtifact({ kind: "test", title: "Simulacro", questions: [] });

      yield* knowledge.recordGaps([makeGap(artifact.id)]);
      yield* artifacts.deleteArtifact(artifact.id);

      return yield* knowledge.getProfile();
    }));

    expect(profile.gaps).toHaveLength(0);
  });
});
