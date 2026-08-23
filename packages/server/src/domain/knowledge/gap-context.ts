import type { KnowledgeGap } from "@proxus/shared";

const DEFAULT_LIMIT = 5;
const QUESTION_LIMIT = 120;

export interface KnowledgeGapContext {
  readonly text: string;
  readonly includedCount: number;
  readonly omittedCount: number;
}

/** Build the bounded, stable context injected into each agent tool step. */
export const buildKnowledgeGapContext = (
  gaps: readonly KnowledgeGap[],
  options: { readonly limit?: number } = {}
): KnowledgeGapContext => {
  const limit = Math.max(0, options.limit ?? DEFAULT_LIMIT);
  const ordered = [...gaps].sort((left, right) => {
    const failCountDifference = (right.failCount ?? 1) - (left.failCount ?? 1);
    if (failCountDifference !== 0) return failCountDifference;

    const failedAtDifference = right.failedAt.localeCompare(left.failedAt);
    if (failedAtDifference !== 0) return failedAtDifference;
    return left.id.localeCompare(right.id);
  });
  const included = ordered.slice(0, limit);
  const omittedCount = Math.max(0, ordered.length - included.length);

  if (ordered.length === 0) {
    return { text: "", includedCount: 0, omittedCount: 0 };
  }

  const lines = [
    "=== STUDENT KNOWLEDGE GAPS & ACTIVE WEAKNESSES ===",
    "The student recently failed the following question(s) in practice quizzes:"
  ];

  for (const gap of included) {
    lines.push(
      `- [${gap.topic}] Question: "${truncate(gap.question, QUESTION_LIMIT)}" (Student Answer: "${gap.studentAnswer}", Correct: "${gap.correctAnswer}", Failed: ${gap.failCount ?? 1} time(s), Status: ${gap.status})`
    );
  }

  if (omittedCount > 0) {
    lines.push(`and ${omittedCount} more gap${omittedCount === 1 ? "" : "s"}: use \`knowledge gaps\` for the full list.`);
  }

  lines.push("When the student asks what to review or asks questions related to these concepts, proactively address their misconceptions.");
  return {
    text: lines.join("\n"),
    includedCount: included.length,
    omittedCount
  };
};

const truncate = (value: string, limit: number) =>
  value.length <= limit ? value : `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
