import { Schema } from "effect";

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
  sourceQuestionId: Schema.String
});
export type KnowledgeGap = typeof KnowledgeGap.Type;

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
