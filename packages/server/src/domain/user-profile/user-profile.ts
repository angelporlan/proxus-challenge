import { Context, Data, Effect } from "effect";
import type { UpdateUserProfileInput, UserProfile } from "@proxus/shared";

export class UserProfileRepositoryError extends Data.TaggedError("UserProfileRepositoryError")<{
  readonly reason: unknown;
}> {}

export interface UserProfileRepository {
  readonly getProfile: () => Effect.Effect<UserProfile, UserProfileRepositoryError>;
  readonly saveProfile: (input: UpdateUserProfileInput) => Effect.Effect<UserProfile, UserProfileRepositoryError>;
  readonly clearProfile: () => Effect.Effect<void, UserProfileRepositoryError>;
}

export const UserProfileRepository = Context.Service<UserProfileRepository>(
  "@proxus/server/user-profile/UserProfileRepository"
);
