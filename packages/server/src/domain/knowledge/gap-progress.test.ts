import { describe, expect, it } from "vitest";
import { MASTERY_STREAK, resolveGapTransitions } from "./gap-progress.ts";
import type { Artifact, ArtifactAttempt } from "../artifacts/artifact.ts";

const quiz = (artifactId: string, reinforcesGapId?: string): Artifact => ({
  kind: "quiz",
  id: artifactId,
  title: "Tema de prueba",
  questions: [{
    type: "true-false",
    id: "q1",
    prompt: "La afirmación es correcta",
    correctAnswer: true,
    explanation: "Explicación",
    ...(reinforcesGapId !== undefined ? { reinforcesGapId } : {})
  }]
});

const graded = (artifactId: string, answer: boolean): ArtifactAttempt => ({
  artifactKind: "quiz",
  status: "graded",
  id: `attempt-${artifactId}-${answer}`,
  artifactId,
  answers: [{ questionType: "true-false", questionId: "q1", answer }],
  score: answer ? 1 : 0,
  maxScore: 1,
  summary: answer ? "1/1 correct" : "0/1 correct",
  corrections: [{
    questionType: "true-false",
    questionId: "q1",
    correct: answer,
    answer,
    correctAnswer: true,
    explanation: "Explicación"
  }]
});

const twoQuestionRescue = (artifactId: string, gapId: string): Artifact => ({
  kind: "quiz",
  id: artifactId,
  title: "Rescate doble",
  questions: ["q1", "q2"].map((id) => ({
    type: "true-false" as const,
    id,
    prompt: `Pregunta ${id}`,
    correctAnswer: true,
    explanation: "Explicación",
    reinforcesGapId: gapId
  }))
});

const twoQuestionAttempt = (
  artifactId: string,
  answers: readonly [boolean, boolean]
): ArtifactAttempt => ({
  artifactKind: "quiz",
  status: "graded",
  id: `attempt-${artifactId}-${answers.join("-")}`,
  artifactId,
  answers: [
    { questionType: "true-false", questionId: "q1", answer: answers[0] },
    { questionType: "true-false", questionId: "q2", answer: answers[1] }
  ],
  score: answers.filter(Boolean).length,
  maxScore: 2,
  summary: `${answers.filter(Boolean).length}/2 correct`,
  corrections: [
    {
      questionType: "true-false" as const,
      questionId: "q1",
      correct: answers[0],
      answer: answers[0],
      correctAnswer: true,
      explanation: "Explicación"
    },
    {
      questionType: "true-false" as const,
      questionId: "q2",
      correct: answers[1],
      answer: answers[1],
      correctAnswer: true,
      explanation: "Explicación"
    }
  ]
});

describe("resolveGapTransitions", () => {
  it("creates a gap with a first failure and increments it without duplicates", () => {
    const first = resolveGapTransitions(quiz("quiz-1"), graded("quiz-1", false), [], "2026-01-01T00:00:00.000Z");
    expect(first.upserts).toHaveLength(1);
    expect(first.upserts[0]).toMatchObject({ failCount: 1, correctStreak: 0, status: "active" });
    expect(first.summary.newGapIds).toEqual(["gap-quiz-1-q1"]);

    const second = resolveGapTransitions(quiz("quiz-1"), graded("quiz-1", false), first.upserts, "2026-01-02T00:00:00.000Z");
    expect(second.upserts).toHaveLength(1);
    expect(second.upserts[0]).toMatchObject({ id: "gap-quiz-1-q1", failCount: 2, correctStreak: 0, status: "active" });
    expect(second.summary.newGapIds).toEqual([]);
    expect(second.summary.reinforcedGapIds).toEqual(["gap-quiz-1-q1"]);
  });

  it("requires two linked correct answers, then reopens on a later failure", () => {
    const failed = resolveGapTransitions(quiz("quiz-1"), graded("quiz-1", false), [], "2026-01-01T00:00:00.000Z");
    const gapId = failed.upserts[0]!.id;
    const rescue = quiz("rescue-1", gapId);

    const firstCorrect = resolveGapTransitions(rescue, graded("rescue-1", true), failed.upserts, "2026-01-02T00:00:00.000Z");
    expect(firstCorrect.upserts[0]).toMatchObject({ status: "reviewing", correctStreak: 1 });
    expect(firstCorrect.summary.reinforcedGapIds).toEqual([gapId]);
    expect(firstCorrect.summary.masteredGapIds).toEqual([]);

    const secondCorrect = resolveGapTransitions(rescue, graded("rescue-1", true), firstCorrect.upserts, "2026-01-03T00:00:00.000Z");
    expect(secondCorrect.upserts[0]).toMatchObject({
      status: "mastered",
      correctStreak: MASTERY_STREAK,
      masteryEvidence: "graded-attempt"
    });
    expect(secondCorrect.summary.masteredGapIds).toEqual([gapId]);
    expect(secondCorrect.summary.reinforcedGapIds).toEqual([]);

    const laterFailure = resolveGapTransitions(rescue, graded("rescue-1", false), secondCorrect.upserts, "2026-01-04T00:00:00.000Z");
    expect(laterFailure.upserts[0]).toMatchObject({ status: "active", correctStreak: 0, failCount: 2 });
    expect(laterFailure.upserts[0]?.masteryEvidence).toBeUndefined();
    expect(laterFailure.upserts[0]?.masteredAt).toBeUndefined();
    expect(laterFailure.summary.reinforcedGapIds).toEqual([gapId]);
    expect(laterFailure.summary.newGapIds).toEqual([]);
  });

  it("chains two linked questions in one graded attempt without double-counting the summary", () => {
    const failed = resolveGapTransitions(quiz("quiz-1"), graded("quiz-1", false), [], "2026-01-01T00:00:00.000Z");
    const gapId = failed.upserts[0]!.id;
    const result = resolveGapTransitions(
      twoQuestionRescue("rescue-1", gapId),
      twoQuestionAttempt("rescue-1", [true, true]),
      failed.upserts,
      "2026-01-02T00:00:00.000Z"
    );

    expect(result.upserts[0]).toMatchObject({ status: "mastered", correctStreak: 2 });
    expect(result.summary.masteredGapIds).toEqual([gapId]);
    expect(result.summary.reinforcedGapIds).toEqual([]);
  });

  it("treats a mixed linked attempt as a single regression regardless of answer order", () => {
    const failed = resolveGapTransitions(quiz("quiz-1"), graded("quiz-1", false), [], "2026-01-01T00:00:00.000Z");
    const gapId = failed.upserts[0]!.id;
    const rescue = twoQuestionRescue("rescue-1", gapId);

    const failThenCorrect = resolveGapTransitions(rescue, twoQuestionAttempt("rescue-1", [false, true]), failed.upserts, "2026-01-02T00:00:00.000Z");
    const correctThenFail = resolveGapTransitions(rescue, twoQuestionAttempt("rescue-1", [true, false]), failed.upserts, "2026-01-02T00:00:00.000Z");

    expect(failThenCorrect.upserts[0]).toMatchObject({ id: gapId, status: "active", correctStreak: 0, failCount: 2 });
    expect(correctThenFail.upserts[0]).toMatchObject({ id: gapId, status: "active", correctStreak: 0, failCount: 2 });
    expect(failThenCorrect.summary.reinforcedGapIds).toEqual([gapId]);
    expect(failThenCorrect.summary.masteredGapIds).toEqual([]);
    expect(failThenCorrect.summary.newGapIds).toEqual([]);
  });

  it("increments failCount once when two linked questions fail in the same attempt", () => {
    const failed = resolveGapTransitions(quiz("quiz-1"), graded("quiz-1", false), [], "2026-01-01T00:00:00.000Z");
    const gapId = failed.upserts[0]!.id;
    const result = resolveGapTransitions(
      twoQuestionRescue("rescue-1", gapId),
      twoQuestionAttempt("rescue-1", [false, false]),
      failed.upserts,
      "2026-01-02T00:00:00.000Z"
    );

    expect(result.upserts).toHaveLength(1);
    expect(result.upserts[0]).toMatchObject({ id: gapId, failCount: 2, status: "active" });
    expect(result.summary.newGapIds).toEqual([]);
  });

  it("records an orphaned correct anchor without creating a gap", () => {
    const result = resolveGapTransitions(quiz("rescue-1", "missing-gap"), graded("rescue-1", true), [], "2026-01-01T00:00:00.000Z");
    expect(result.upserts).toEqual([]);
    expect(result.summary.orphanedAnchorIds).toEqual(["missing-gap"]);
    expect(result.summary.newGapIds).toEqual([]);
  });

  it("falls back to a new gap when a failed question points at a missing anchor", () => {
    const result = resolveGapTransitions(quiz("rescue-1", "missing-gap"), graded("rescue-1", false), [], "2026-01-01T00:00:00.000Z");
    expect(result.upserts).toHaveLength(1);
    expect(result.upserts[0]).toMatchObject({ id: "gap-rescue-1-q1", failCount: 1, status: "active" });
    expect(result.summary.orphanedAnchorIds).toEqual(["missing-gap"]);
    expect(result.summary.newGapIds).toEqual(["gap-rescue-1-q1"]);
  });

  it("does not create a gap for an unanchored correct answer", () => {
    const result = resolveGapTransitions(quiz("quiz-1"), graded("quiz-1", true), [], "2026-01-01T00:00:00.000Z");
    expect(result).toEqual({
      upserts: [],
      summary: { masteredGapIds: [], reinforcedGapIds: [], newGapIds: [], orphanedAnchorIds: [] }
    });
  });
});
