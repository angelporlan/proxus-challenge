import { describe, expect, it, beforeEach } from "vitest";
import { Effect, Layer, Path } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import type { KnowledgeGap } from "@proxus/shared";
import { FileKnowledgeRepository } from "./file-knowledge-repository.ts";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

describe("FileKnowledgeRepository", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxus-knowledge-test-"));
    return () => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    };
  });

  const runWithRepo = <A, E>(
    fn: (repo: ReturnType<typeof FileKnowledgeRepository.make> extends Effect.Effect<infer R, any, any> ? R : never) => Effect.Effect<A, E>
  ) => Effect.gen(function* () {
    const repo = yield* FileKnowledgeRepository.make(tempDir);
    return yield* fn(repo);
  }).pipe(
    Effect.provide(Layer.mergeAll(NodeFileSystem.layer, Path.layer)),
    Effect.runPromise
  );

  const makeGap = (id: string, sourceArtifactId: string): KnowledgeGap => ({
    id,
    conceptId: `concept-${id}`,
    topic: "Tema de prueba",
    question: `Pregunta ${id}`,
    studentAnswer: "Respuesta incorrecta",
    correctAnswer: "Respuesta correcta",
    explanation: "Explicación",
    status: "active",
    failedAt: new Date().toISOString(),
    sourceArtifactId,
    sourceQuestionId: `question-${id}`
  });

  it("removes every gap belonging to a deleted artifact and preserves other profile data", async () => {
    await runWithRepo((repo) => repo.recordGaps([
      makeGap("gap-quiz-1", "quiz-1"),
      makeGap("gap-quiz-2", "quiz-1"),
      makeGap("gap-quiz-3", "quiz-2")
    ]));

    await runWithRepo((repo) => repo.updateGapStatus("gap-quiz-1", "mastered"));
    await runWithRepo((repo) => repo.removeGapsByArtifactId("quiz-1"));

    const profile = await runWithRepo((repo) => repo.getProfile());
    expect(profile.gaps.map((gap) => gap.id)).toEqual(["gap-quiz-3"]);
    expect(profile.gaps[0]?.sourceArtifactId).toBe("quiz-2");
    expect(profile.totalAttempts).toBe(1);
  });
});
