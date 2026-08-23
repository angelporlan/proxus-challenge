import { describe, expect, it } from "vitest";
import type { KnowledgeGap } from "@proxus/shared";
import { buildKnowledgeGapContext } from "./gap-context.ts";

const gap = (id: string, failCount: number, failedAt: string, question: string): KnowledgeGap => ({
  id,
  conceptId: id,
  topic: `Tema ${id}`,
  question,
  studentAnswer: "mal",
  correctAnswer: "bien",
  explanation: "explicación",
  status: "active",
  failedAt,
  sourceArtifactId: "artifact",
  sourceQuestionId: id,
  failCount
});

describe("buildKnowledgeGapContext", () => {
  it("sorts deterministically, limits the block, and truncates questions", () => {
    const result = buildKnowledgeGapContext([
      gap("old", 3, "2026-01-01T00:00:00.000Z", "vieja"),
      gap("recent", 3, "2026-01-03T00:00:00.000Z", "reciente"),
      gap("frequent", 5, "2025-01-01T00:00:00.000Z", "x".repeat(140))
    ], { limit: 2 });

    expect(result.includedCount).toBe(2);
    expect(result.omittedCount).toBe(1);
    expect(result.text.indexOf("[Tema frequent]")).toBeLessThan(result.text.indexOf("[Tema recent]"));
    expect(result.text).toContain("x".repeat(119) + "…");
    expect(result.text).toContain("and 1 more gap: use `knowledge gaps` for the full list.");
  });

  it("returns an empty context for an empty profile", () => {
    expect(buildKnowledgeGapContext([])).toEqual({ text: "", includedCount: 0, omittedCount: 0 });
  });
});
