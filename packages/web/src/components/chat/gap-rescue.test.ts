import { describe, expect, it } from "vitest";
import { buildGapRescueDisplay, buildGapRescuePrompt, GAP_RESCUE_QUESTION_COUNTS } from "./gap-rescue.ts";

describe("gap rescue question counts", () => {
  it("offers 3, 6 and 10", () => {
    expect(GAP_RESCUE_QUESTION_COUNTS.map((option) => option.value)).toEqual([3, 6, 10]);
    expect(GAP_RESCUE_QUESTION_COUNTS.map((option) => option.label)).toEqual(["3", "6", "10"]);
  });

  it("asks for an exact question count capped at 10", () => {
    expect(buildGapRescuePrompt(6)).toContain("exactamente 6 preguntas");
    expect(buildGapRescuePrompt(10)).toContain("Nunca más de 10");
    expect(buildGapRescueDisplay(6)).toBe("Rescate de lagunas · 6 preguntas");
  });
});
