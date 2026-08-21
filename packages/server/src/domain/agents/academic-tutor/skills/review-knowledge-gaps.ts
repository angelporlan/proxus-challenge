import { AgentSkill } from "../../harness/index.ts";

export const ReviewKnowledgeGapsSkill = AgentSkill.make({
  name: "review-knowledge-gaps",
  description: "Inspect the student's learning profile and knowledge gaps (questions failed in previous quizzes/tests), and review weak concepts proactively.",
  content: [
    "# Review Knowledge Gaps",
    "",
    "Use this skill when:",
    "- The student asks what to review, asks about their weak points, or asks for a personalized study plan.",
    "- You want to proactively guide the student based on past quiz errors.",
    "- You want to mark concepts as reviewed or mastered after explaining them.",
    "",
    "Available CLI commands:",
    "- `knowledge gaps`: list active knowledge gaps with questions and explanations.",
    "- `knowledge summary`: get a concise overview of weak topics.",
    "- `knowledge review <gapId>`: mark a gap as currently reviewing.",
    "- `knowledge master <gapId>`: mark a gap as mastered after the student demonstrates understanding.",
    "",
    "Workflow:",
    "1. When the student asks what to study, run `knowledge gaps` to inspect their actual errors.",
    "2. If gaps exist, pick the most critical topic, cite the specific question they failed, and explain the core concept clearly.",
    "3. Use the Socratic method to test if they now understand the distinction.",
    "4. When the student confirms or answers correctly, run `knowledge master <gapId>` to mark it resolved."
  ].join("\n")
});
