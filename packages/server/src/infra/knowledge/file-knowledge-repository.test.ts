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
    expect(profile.totalAttempts).toBe(0);
  });

  it("increments totalAttempts only when an attempt is completed", async () => {
    await runWithRepo((repo) => repo.recordGaps([makeGap("gap-1", "quiz-1")]));
    const afterGaps = await runWithRepo((repo) => repo.getProfile());
    expect(afterGaps.totalAttempts).toBe(0);

    await runWithRepo((repo) => repo.recordCompletedAttempt());
    const afterAttempt = await runWithRepo((repo) => repo.getProfile());
    expect(afterAttempt.totalAttempts).toBe(1);
    expect(afterAttempt.gaps).toHaveLength(1);
  });

  it("removes gaps that belong to a deleted PDF", async () => {
    await runWithRepo((repo) => repo.recordGaps([
      { ...makeGap("gap-pdf", "quiz-1"), sourceMaterialId: "pdf-1" },
      makeGap("gap-other", "quiz-2")
    ]));

    await runWithRepo((repo) => repo.removeGapsByMaterialId("pdf-1"));
    const profile = await runWithRepo((repo) => repo.getProfile());
    expect(profile.gaps.map((gap) => gap.id)).toEqual(["gap-other"]);
  });

  it("applies resolved transitions without forcing active status", async () => {
    await runWithRepo((repo) => repo.recordGaps([makeGap("gap-1", "quiz-1")]));
    const current = await runWithRepo((repo) => repo.getProfile());
    const resolved = { ...current.gaps[0]!, status: "mastered" as const, correctStreak: 2, masteryEvidence: "graded-attempt" as const };

    await runWithRepo((repo) => repo.applyTransitions([resolved]));
    const profile = await runWithRepo((repo) => repo.getProfile());
    expect(profile.gaps).toEqual([resolved]);
  });

  it("decodes a legacy profile without deleting its existing history", async () => {
    const legacyGap = makeGap("legacy-gap", "legacy-quiz");
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, "profile.json"), JSON.stringify({
      gaps: [legacyGap],
      totalAttempts: 4,
      lastAttemptAt: "2026-01-01T00:00:00.000Z"
    }));

    const profile = await runWithRepo((repo) => repo.getProfile());
    expect(profile).toMatchObject({ gaps: [legacyGap], totalAttempts: 4, lastAttemptAt: "2026-01-01T00:00:00.000Z" });
  });
});
