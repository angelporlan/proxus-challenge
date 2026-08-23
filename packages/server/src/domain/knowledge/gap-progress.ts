import { MASTERY_STREAK, type KnowledgeGap, type KnowledgeUpdateSummary } from "@proxus/shared";
import type {
  Artifact,
  ArtifactAttempt
} from "../artifacts/artifact.ts";

export { MASTERY_STREAK };

const DEFAULT_TRANSITION_TIMESTAMP = "1970-01-01T00:00:00.000Z";

export interface GapTransitionResult {
  readonly upserts: readonly KnowledgeGap[];
  readonly summary: KnowledgeUpdateSummary;
}

type ExerciseArtifact = Extract<Artifact, { readonly kind: "quiz" | "test" }>;
type GradedAttempt = Extract<ArtifactAttempt, { readonly status: "graded" }>;
type Correction = GradedAttempt["corrections"][number];
type Answer = Extract<ArtifactAttempt, { readonly status: "ungraded" | "graded" }>["answers"][number];
type FailureDetails = ReturnType<typeof correctionDetails>;

interface AnchoredBucket {
  readonly gap: KnowledgeGap;
  correctCount: number;
  failed: boolean;
  lastFailure: FailureDetails | undefined;
}

/**
 * Resolve the knowledge state from a graded artifact attempt.
 *
 * Linked questions for the same gap are aggregated first so mixed or
 * out-of-order answers in one attempt produce a single, order-independent
 * transition. A later correct answer on the original source question counts
 * as evidence, same as a rescue question with `reinforcesGapId`.
 * The optional timestamp is injected by the repository boundary.
 */
export const resolveGapTransitions = (
  artifact: Artifact,
  graded: ArtifactAttempt,
  existing: readonly KnowledgeGap[],
  now = DEFAULT_TRANSITION_TIMESTAMP
): GapTransitionResult => {
  const masteredGapIds: string[] = [];
  const reinforcedGapIds: string[] = [];
  const newGapIds: string[] = [];
  const orphanedAnchorIds: string[] = [];
  const summary = (): KnowledgeUpdateSummary => ({
    masteredGapIds,
    reinforcedGapIds,
    newGapIds,
    orphanedAnchorIds
  });

  if (graded.status !== "graded" || (artifact.kind !== "quiz" && artifact.kind !== "test")) {
    return { upserts: [], summary: summary() };
  }

  const gapsById = new Map(existing.map((gap) => [gap.id, gap]));
  const upsertsById = new Map<string, KnowledgeGap>();
  const anchored = new Map<string, AnchoredBucket>();
  const unanchoredFailures: Array<{ readonly correction: Correction; readonly answer: Answer | undefined }> = [];

  const addSummaryId = (bucket: string[], id: string) => {
    if (!bucket.includes(id)) bucket.push(id);
  };

  const findSourceGap = (questionId: string) =>
    gapsById.get(`gap-${artifact.id}-${questionId}`)
    ?? existing.find((gap) => gap.sourceArtifactId === artifact.id && gap.sourceQuestionId === questionId);

  const addToBucket = (gap: KnowledgeGap, isCorrect: boolean, correction: Correction, answer: Answer | undefined) => {
    const bucket = anchored.get(gap.id) ?? {
      gap,
      correctCount: 0,
      failed: false,
      lastFailure: undefined
    };
    if (isCorrect) {
      bucket.correctCount += 1;
    } else {
      bucket.failed = true;
      bucket.lastFailure = correctionDetails(artifact, correction, answer);
    }
    anchored.set(gap.id, bucket);
  };

  for (const correction of graded.corrections) {
    const answer = graded.answers.find((candidate) => candidate.questionId === correction.questionId);
    if (!isStudentAnswerProvided(answer)) continue;

    const question = artifact.questions.find((candidate) => candidate.id === correction.questionId);
    const anchorId = question?.reinforcesGapId;
    const isCorrect = correction.questionType === "short-answer"
      ? correction.score >= correction.maxScore
      : correction.correct;

    if (anchorId !== undefined) {
      const anchoredGap = gapsById.get(anchorId);
      if (anchoredGap === undefined) {
        addSummaryId(orphanedAnchorIds, anchorId);
        if (!isCorrect) {
          unanchoredFailures.push({ correction, answer });
        }
        continue;
      }

      addToBucket(anchoredGap, isCorrect, correction, answer);
      continue;
    }

    const sourceGap = findSourceGap(correction.questionId);
    if (isCorrect) {
      if (sourceGap !== undefined) {
        addToBucket(sourceGap, true, correction, answer);
      }
      continue;
    }

    unanchoredFailures.push({ correction, answer });
  }

  for (const bucket of anchored.values()) {
    const updated = bucket.failed && bucket.lastFailure !== undefined
      ? applyFailure(bucket.gap, artifact.id, now, bucket.lastFailure)
      : applyCorrectAnswer(bucket.gap, artifact.id, now, bucket.correctCount);
    upsertsById.set(updated.id, updated);
    if (updated.status === "mastered") {
      addSummaryId(masteredGapIds, updated.id);
    } else {
      addSummaryId(reinforcedGapIds, updated.id);
    }
  }

  for (const { correction, answer } of unanchoredFailures) {
    const details = correctionDetails(artifact, correction, answer);
    const generatedId = `gap-${artifact.id}-${correction.questionId}`;
    const existingGap = upsertsById.get(generatedId)
      ?? gapsById.get(generatedId)
      ?? existing.find((gap) => gap.sourceArtifactId === artifact.id && gap.sourceQuestionId === correction.questionId)
      ?? existing.find((gap) => gap.question === details.question);

    if (existingGap !== undefined) {
      const updated = applyFailure(existingGap, artifact.id, now, details);
      upsertsById.set(updated.id, updated);
      if (!masteredGapIds.includes(updated.id)) {
        addSummaryId(reinforcedGapIds, updated.id);
      }
    } else {
      const gap = createGap(artifact, generatedId, correction.questionId, details, now);
      upsertsById.set(gap.id, gap);
      addSummaryId(newGapIds, gap.id);
    }
  }

  return {
    upserts: [...upsertsById.values()],
    summary: summary()
  };
};

const isStudentAnswerProvided = (answer: Answer | undefined) => {
  if (answer === undefined) return false;
  if (answer.questionType === "multiple-choice") return answer.selectedOptionId.trim().length > 0;
  if (answer.questionType === "short-answer") return answer.answer.trim().length > 0;
  return true;
};

const correctionDetails = (
  artifact: ExerciseArtifact,
  correction: Correction,
  answer: Answer | undefined
) => {
  const question = artifact.questions.find((candidate) => candidate.id === correction.questionId);
  const questionText = question?.prompt ?? `Pregunta ${correction.questionId}`;

  switch (correction.questionType) {
    case "multiple-choice": {
      const multipleChoice = question?.type === "multiple-choice" ? question : undefined;
      return {
        question: questionText,
        studentAnswer: multipleChoice?.options.find((option) => option.id === correction.selectedOptionId)?.text ?? correction.selectedOptionId,
        correctAnswer: multipleChoice?.options.find((option) => option.id === correction.correctOptionId)?.text ?? correction.correctOptionId,
        explanation: correction.explanation
      };
    }
    case "true-false":
      return {
        question: questionText,
        studentAnswer: String(correction.answer),
        correctAnswer: String(correction.correctAnswer),
        explanation: correction.explanation
      };
    case "short-answer": {
      const shortAnswer = question?.type === "short-answer" ? question : undefined;
      return {
        question: questionText,
        studentAnswer: answer?.questionType === "short-answer" ? answer.answer : "Respuesta enviada",
        correctAnswer: shortAnswer?.expectedAnswer ?? "Respuesta esperada",
        explanation: correction.feedback
      };
    }
  }
};

const createGap = (
  artifact: ExerciseArtifact,
  id: string,
  questionId: string,
  details: FailureDetails,
  failedAt: string
): KnowledgeGap => ({
  id,
  conceptId: questionId,
  topic: artifact.title,
  question: details.question,
  studentAnswer: details.studentAnswer,
  correctAnswer: details.correctAnswer,
  explanation: details.explanation,
  status: "active",
  failedAt,
  sourceArtifactId: artifact.id,
  sourceQuestionId: questionId,
  failCount: 1,
  correctStreak: 0,
  ...(artifact.sourceMaterialId !== undefined ? { sourceMaterialId: artifact.sourceMaterialId } : {})
});

const applyFailure = (
  gap: KnowledgeGap,
  artifactId: string,
  failedAt: string,
  details: FailureDetails
): KnowledgeGap => {
  const { masteryEvidence: _masteryEvidence, masteredAt: _masteredAt, ...rest } = gap;
  return {
    ...rest,
    studentAnswer: details.studentAnswer,
    correctAnswer: details.correctAnswer,
    explanation: details.explanation,
    status: "active",
    failedAt,
    failCount: (gap.failCount ?? 1) + 1,
    correctStreak: 0,
    lastReinforcedByArtifactId: artifactId
  };
};

const applyCorrectAnswer = (
  gap: KnowledgeGap,
  artifactId: string,
  reinforcedAt: string,
  increment: number
): KnowledgeGap => {
  const correctStreak = (gap.correctStreak ?? 0) + increment;
  const mastered = correctStreak >= MASTERY_STREAK;
  return {
    ...gap,
    correctStreak,
    status: mastered ? "mastered" : "reviewing",
    lastReinforcedByArtifactId: artifactId,
    ...(mastered
      ? { masteredAt: reinforcedAt, masteryEvidence: "graded-attempt" as const }
      : { reviewedAt: reinforcedAt })
  };
};
