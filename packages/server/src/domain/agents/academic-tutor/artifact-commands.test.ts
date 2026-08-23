import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { optionId, normalizeMultipleChoiceQuestion, validateKnowledgeAnchors } from "./artifact-commands.ts";
import type { KnowledgeRepository } from "../../knowledge/knowledge-profile.ts";

describe("artifact-commands normalization", () => {
  describe("optionId", () => {
    it("converts strings to a stable id", () => {
      expect(optionId("Option A")).toBe("option-a");
      expect(optionId("  Trimmed  ")).toBe("trimmed");
      expect(optionId("Nözi char")).toBe("nozi-char");
      expect(optionId("Special @#$ chars")).toBe("special-chars");
      expect(optionId("")).toBe("option");
    });
  });

  describe("normalizeMultipleChoiceQuestion", () => {
    it("converts string options to objects with ids", () => {
      const q = {
        type: "multiple-choice",
        options: ["Apple", "Banana"],
        correctOptionId: "Banana"
      };

      const normalized = normalizeMultipleChoiceQuestion(q) as {
        options: Array<{ id: string; text: string }>;
        correctOptionId: string;
      };

      expect(normalized.options).toEqual([
        { id: "apple", text: "Apple" },
        { id: "banana", text: "Banana" }
      ]);
      expect(normalized.correctOptionId).toBe("banana");
    });

    it("leaves already normalized questions intact", () => {
      const q = {
        type: "multiple-choice",
        options: [
          { id: "o1", text: "One" },
          { id: "o2", text: "Two" }
        ],
        correctOptionId: "o2"
      };

      const normalized = normalizeMultipleChoiceQuestion(q) as {
        options: Array<{ id: string; text: string }>;
        correctOptionId: string;
      };

      expect(normalized.options).toEqual(q.options);
      expect(normalized.correctOptionId).toBe("o2");
    });
  });
});

const stubKnowledge = (gapIds: readonly string[]): KnowledgeRepository => ({
  getProfile: () => Effect.succeed({
    gaps: gapIds.map((id) => ({
      id,
      conceptId: id,
      topic: "Tema",
      question: "Pregunta",
      studentAnswer: "mal",
      correctAnswer: "bien",
      explanation: "e",
      status: "active" as const,
      failedAt: "2026-01-01T00:00:00.000Z",
      sourceArtifactId: "quiz",
      sourceQuestionId: "q1"
    })),
    totalAttempts: 0
  }),
  recordGaps: () => Effect.die("unused"),
  applyTransitions: () => Effect.die("unused"),
  recordCompletedAttempt: () => Effect.die("unused"),
  updateGapStatus: () => Effect.die("unused"),
  removeGapsByArtifactId: () => Effect.die("unused"),
  removeGapsByMaterialId: () => Effect.die("unused"),
  clearProfile: () => Effect.die("unused"),
  listActiveGaps: () => Effect.die("unused")
});

const rescueQuiz = {
  kind: "quiz" as const,
  title: "Rescate",
  questions: [{
    type: "true-false" as const,
    id: "q1",
    prompt: "¿Sigue siendo cierto?",
    correctAnswer: true,
    explanation: "Aritmética",
    reinforcesGapId: "gap-1"
  }]
};

describe("validateKnowledgeAnchors", () => {
  it("accepts a real gap id", async () => {
    await expect(Effect.runPromise(validateKnowledgeAnchors(rescueQuiz, stubKnowledge(["gap-1"])))).resolves.toEqual(rescueQuiz);
  });

  it("rejects an unknown reinforcesGapId", async () => {
    await expect(Effect.runPromise(validateKnowledgeAnchors(rescueQuiz, stubKnowledge([])))).rejects.toMatchObject({
      _tag: "KnowledgeGapAnchorNotFound",
      gapId: "gap-1"
    });
  });

  it("skips validation when there is no knowledge repository", async () => {
    await expect(Effect.runPromise(validateKnowledgeAnchors(rescueQuiz, undefined))).resolves.toEqual(rescueQuiz);
  });
});
