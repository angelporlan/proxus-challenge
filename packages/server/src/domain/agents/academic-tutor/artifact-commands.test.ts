import { describe, it, expect } from "vitest";
import { optionId, normalizeMultipleChoiceQuestion } from "./artifact-commands.ts";

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
