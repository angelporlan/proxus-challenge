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

  it("counts a perfect quiz as one completed attempt", async () => {
    const profile = await runWithRepositories((artifacts, knowledge) => Effect.gen(function* () {
      const quiz = yield* artifacts.createArtifact({
        kind: "quiz",
        title: "Quiz perfecto",
        sourceMaterialId: "pdf-1",
        questions: [{
          type: "true-false",
          id: "q1",
          prompt: "2+2=4",
          correctAnswer: true,
          explanation: "Aritmética"
        }]
      });
      const attempt = yield* artifacts.submitAttempt({
        artifactKind: "quiz",
        artifactId: quiz.id,
        answers: [{ questionType: "true-false", questionId: "q1", answer: true }]
      });
      yield* artifacts.gradeAttempt(attempt.id);
      return yield* knowledge.getProfile();
    }));

    expect(profile.gaps).toHaveLength(0);
    expect(profile.totalAttempts).toBe(1);
  });

  it("copies sourceMaterialId onto recorded gaps", async () => {
    const result = await runWithRepositories((artifacts, knowledge) => Effect.gen(function* () {
      const quiz = yield* artifacts.createArtifact({
        kind: "quiz",
        title: "Quiz con fallos",
        sourceMaterialId: "pdf-1",
        questions: [{
          type: "true-false",
          id: "q1",
          prompt: "2+2=4",
          correctAnswer: true,
          explanation: "Aritmética"
        }]
      });
      const attempt = yield* artifacts.submitAttempt({
        artifactKind: "quiz",
        artifactId: quiz.id,
        answers: [{ questionType: "true-false", questionId: "q1", answer: false }]
      });
      const graded = yield* artifacts.gradeAttempt(attempt.id);
      return { graded, profile: yield* knowledge.getProfile() };
    }));

    const { graded, profile } = result;
    expect(profile.gaps).toHaveLength(1);
    expect(profile.gaps[0]?.sourceMaterialId).toBe("pdf-1");
    expect(profile.gaps[0]?.failCount).toBe(1);
    expect(graded.status === "graded" ? graded.knowledgeUpdates?.newGapIds : []).toEqual([profile.gaps[0]?.id]);
    expect(profile.totalAttempts).toBe(1);
  });

  it("increments a repeated failure and keeps one gap", async () => {
    const profile = await runWithRepositories((artifacts, knowledge) => Effect.gen(function* () {
      const quiz = yield* artifacts.createArtifact({
        kind: "quiz",
        title: "Quiz repetido",
        questions: [{
          type: "true-false",
          id: "q1",
          prompt: "2+2=4",
          correctAnswer: true,
          explanation: "Aritmética"
        }]
      });
      for (let index = 0; index < 2; index++) {
        const attempt = yield* artifacts.submitAttempt({
          artifactKind: "quiz",
          artifactId: quiz.id,
          answers: [{ questionType: "true-false", questionId: "q1", answer: false }]
        });
        yield* artifacts.gradeAttempt(attempt.id);
      }
      return yield* knowledge.getProfile();
    }));

    expect(profile.gaps).toHaveLength(1);
    expect(profile.gaps[0]?.failCount).toBe(2);
    expect(profile.totalAttempts).toBe(2);
  });

  it("reinforces the original gap instead of creating a rescue duplicate", async () => {
    const result = await runWithRepositories((artifacts, knowledge) => Effect.gen(function* () {
      const source = yield* artifacts.createArtifact({
        kind: "quiz",
        title: "Quiz original",
        questions: [{ type: "true-false", id: "q1", prompt: "2+2=4", correctAnswer: true, explanation: "Aritmética" }]
      });
      const failedAttempt = yield* artifacts.submitAttempt({
        artifactKind: "quiz",
        artifactId: source.id,
        answers: [{ questionType: "true-false", questionId: "q1", answer: false }]
      });
      yield* artifacts.gradeAttempt(failedAttempt.id);
      const originalGap = (yield* knowledge.getProfile()).gaps[0]!;

      const rescue = yield* artifacts.createArtifact({
        kind: "quiz",
        title: "Rescate",
        questions: [{ type: "true-false", id: "rescue-q1", prompt: "¿Sigue siendo cierto?", correctAnswer: true, explanation: "Aritmética", reinforcesGapId: originalGap.id }]
      });
      const rescueAttempt = yield* artifacts.submitAttempt({
        artifactKind: "quiz",
        artifactId: rescue.id,
        answers: [{ questionType: "true-false", questionId: "rescue-q1", answer: true }]
      });
      const graded = yield* artifacts.gradeAttempt(rescueAttempt.id);
      return { graded, profile: yield* knowledge.getProfile() };
    }));

    const { graded, profile } = result;
    expect(profile.gaps).toHaveLength(1);
    expect(profile.gaps[0]).toMatchObject({ status: "reviewing", correctStreak: 1, lastReinforcedByArtifactId: expect.any(String) });
    expect(profile.gaps[0]?.sourceArtifactId).not.toBe(profile.gaps[0]?.lastReinforcedByArtifactId);
    expect(profile.gaps[0]?.failCount).toBe(1);
    expect(graded.status === "graded" ? graded.knowledgeUpdates?.reinforcedGapIds : []).toEqual([profile.gaps[0]?.id]);
  });

  it("persists orphaned anchors on the graded attempt and still records the failure", async () => {
    const result = await runWithRepositories((artifacts, knowledge) => Effect.gen(function* () {
      const quiz = yield* artifacts.createArtifact({
        kind: "quiz",
        title: "Rescate huérfano",
        questions: [{
          type: "true-false",
          id: "q1",
          prompt: "2+2=4",
          correctAnswer: true,
          explanation: "Aritmética",
          reinforcesGapId: "missing-gap"
        }]
      });
      const attempt = yield* artifacts.submitAttempt({
        artifactKind: "quiz",
        artifactId: quiz.id,
        answers: [{ questionType: "true-false", questionId: "q1", answer: false }]
      });
      const graded = yield* artifacts.gradeAttempt(attempt.id);
      return { graded, profile: yield* knowledge.getProfile() };
    }));

    const { graded, profile } = result;
    expect(profile.gaps).toHaveLength(1);
    expect(profile.gaps[0]?.failCount).toBe(1);
    expect(graded.status === "graded" ? graded.knowledgeUpdates : undefined).toEqual({
      masteredGapIds: [],
      reinforcedGapIds: [],
      newGapIds: [profile.gaps[0]?.id],
      orphanedAnchorIds: ["missing-gap"]
    });
  });
});
