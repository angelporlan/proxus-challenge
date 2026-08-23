import { describe, expect, it } from "vitest";
import { AcademicTutorSkills } from "./index.ts";
import { AdaptiveStudyPlanSkill } from "./adaptive-study-plan.ts";
import { ReviewKnowledgeGapsSkill } from "./review-knowledge-gaps.ts";

describe("AcademicTutorSkills", () => {
  it("registers gap rescue and the adaptive study plan", () => {
    expect(AcademicTutorSkills.map((skill) => skill.name)).toEqual([
      "use-uploaded-materials",
      "search-materials",
      "create-study-artifacts",
      "review-knowledge-gaps",
      "adaptive-study-plan"
    ]);
  });
});

describe("ReviewKnowledgeGapsSkill", () => {
  it("instructs a search-then-quiz rescue when gaps exist", () => {
    expect(ReviewKnowledgeGapsSkill.content).toContain("knowledge gaps");
    expect(ReviewKnowledgeGapsSkill.content).toContain("materials search");
    expect(ReviewKnowledgeGapsSkill.content).toContain("artifacts create");
    expect(ReviewKnowledgeGapsSkill.content).toContain("Never copy a failed question verbatim");
  });

  it("creates exactly one new quiz and never lists existing artifacts", () => {
    expect(ReviewKnowledgeGapsSkill.content).toContain("Create exactly ONE new quiz this turn");
    expect(ReviewKnowledgeGapsSkill.content).toContain("Never run `artifacts list` or `artifacts show`");
  });

  it("honors the requested question count with a maximum of 10", () => {
    expect(ReviewKnowledgeGapsSkill.content).toContain("Honor the requested question count exactly");
    expect(ReviewKnowledgeGapsSkill.content).toContain("hard maximum of 10 questions");
    expect(ReviewKnowledgeGapsSkill.content).toContain("if the student did not specify a count, default to 3");
    expect(ReviewKnowledgeGapsSkill.content).not.toContain("one new question per active gap");
  });

  it("offers a diagnostic quiz when the profile is clean", () => {
    expect(ReviewKnowledgeGapsSkill.content).toContain("If no gaps exist");
    expect(ReviewKnowledgeGapsSkill.content).toContain("general diagnostic quiz");
  });

  it("anchors every rescue question and derives mastery from grading", () => {
    expect(ReviewKnowledgeGapsSkill.content).toContain("reinforcesGapId");
    expect(ReviewKnowledgeGapsSkill.content).toContain("two correct graded answers");
    expect(ReviewKnowledgeGapsSkill.content).not.toContain("knowledge master");
  });
});

describe("AdaptiveStudyPlanSkill", () => {
  it("orchestrates list, gaps, markdown roadmap, and a persisted note", () => {
    expect(AdaptiveStudyPlanSkill.content).toContain("materials list");
    expect(AdaptiveStudyPlanSkill.content).toContain("knowledge gaps");
    expect(AdaptiveStudyPlanSkill.content).toContain("Fases de estudio");
    expect(AdaptiveStudyPlanSkill.content).toContain("Checklist");
    expect(AdaptiveStudyPlanSkill.content).toContain("\"kind\":\"note\"");
    expect(AdaptiveStudyPlanSkill.content).toContain("Never skip `artifacts create`");
  });

  it("persists only a note and forbids quizzes in the same turn", () => {
    expect(AdaptiveStudyPlanSkill.content).toContain("Create exactly ONE artifact this turn: a `note`");
    expect(AdaptiveStudyPlanSkill.content).toContain("Never create a quiz or a test");
    expect(AdaptiveStudyPlanSkill.content).toContain("Never run `artifacts list` or `artifacts show`");
  });
});
