import { Schema } from "effect";

export const UserProfile = Schema.Struct({
  educationLevel: Schema.optional(Schema.String),
  educationLevelLabel: Schema.optional(Schema.String),
  study: Schema.optional(Schema.String),
  mainDifficulty: Schema.optional(Schema.String),
  mainDifficultyLabel: Schema.optional(Schema.String),
  mainBlocker: Schema.optional(Schema.String),
  goal: Schema.optional(Schema.String),
  goalLabel: Schema.optional(Schema.String),
  onboardingCompleted: Schema.Boolean,
  completedAt: Schema.optional(Schema.String),
  updatedAt: Schema.optional(Schema.String)
});
export type UserProfile = typeof UserProfile.Type;

export const UpdateUserProfileInput = Schema.Struct({
  educationLevel: Schema.optional(Schema.String),
  educationLevelLabel: Schema.optional(Schema.String),
  study: Schema.optional(Schema.String),
  mainDifficulty: Schema.optional(Schema.String),
  mainDifficultyLabel: Schema.optional(Schema.String),
  mainBlocker: Schema.optional(Schema.String),
  goal: Schema.optional(Schema.String),
  goalLabel: Schema.optional(Schema.String),
  onboardingCompleted: Schema.optional(Schema.Boolean)
});
export type UpdateUserProfileInput = typeof UpdateUserProfileInput.Type;
