import { Schema } from "effect";

/** Consecutive linked correct answers required before a gap is mastered. They may land in the same graded attempt. */
export const MASTERY_STREAK = 2;

export const KnowledgeGapStatus = Schema.Union([
  Schema.Literal("active"),
  Schema.Literal("reviewing"),
  Schema.Literal("mastered")
]);
export type KnowledgeGapStatus = typeof KnowledgeGapStatus.Type;

export const KnowledgeGap = Schema.Struct({
  id: Schema.String,
  conceptId: Schema.String,
  topic: Schema.String,
  question: Schema.String,
  studentAnswer: Schema.String,
  correctAnswer: Schema.String,
  explanation: Schema.String,
  status: KnowledgeGapStatus,
  failedAt: Schema.String,
  reviewedAt: Schema.optional(Schema.String),
  masteredAt: Schema.optional(Schema.String),
  sourceArtifactId: Schema.String,
  sourceQuestionId: Schema.String,
  sourceMaterialId: Schema.optional(Schema.String),
  failCount: Schema.optional(Schema.Number),
  correctStreak: Schema.optional(Schema.Number),
  masteryEvidence: Schema.optional(Schema.Union([
    Schema.Literal("graded-attempt"),
    Schema.Literal("manual")
  ])),
  lastReinforcedByArtifactId: Schema.optional(Schema.String)
});
export type KnowledgeGap = typeof KnowledgeGap.Type;

export const KnowledgeUpdateSummary = Schema.Struct({
  masteredGapIds: Schema.Array(Schema.String),
  reinforcedGapIds: Schema.Array(Schema.String),
  newGapIds: Schema.Array(Schema.String),
  orphanedAnchorIds: Schema.Array(Schema.String)
});
export type KnowledgeUpdateSummary = typeof KnowledgeUpdateSummary.Type;

export const KnowledgeProfile = Schema.Struct({
  gaps: Schema.Array(KnowledgeGap),
  totalAttempts: Schema.Number,
  lastAttemptAt: Schema.optional(Schema.String)
});
export type KnowledgeProfile = typeof KnowledgeProfile.Type;

export const UpdateGapStatusInput = Schema.Struct({
  status: KnowledgeGapStatus
});
export type UpdateGapStatusInput = typeof UpdateGapStatusInput.Type;
