import { Effect, FileSystem, Layer, Path, Schema } from "effect";
import {
  UserProfile,
  type UpdateUserProfileInput,
  type UserProfile as UserProfileType
} from "@proxus/shared";
import {
  UserProfileRepository,
  UserProfileRepositoryError,
  type UserProfileRepository as UserProfileRepositoryType
} from "../../domain/user-profile/user-profile.ts";

const UserProfileFromJson = Schema.fromJsonString(UserProfile);

const defaultProfile: UserProfileType = {
  onboardingCompleted: false
};

export const FileUserProfileRepository = {
  make: (
    directory: string
  ): Effect.Effect<UserProfileRepositoryType, never, FileSystem.FileSystem | Path.Path> =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const filePath = path.join(directory, "user_profile.json");
      const mapError = (reason: unknown) => new UserProfileRepositoryError({ reason });

      const ensureDirectory = () =>
        fs.makeDirectory(directory, { recursive: true }).pipe(Effect.mapError(mapError));

      const readProfile = (): Effect.Effect<UserProfileType, UserProfileRepositoryError> =>
        Effect.gen(function* () {
          yield* ensureDirectory();
          const exists = yield* fs.exists(filePath).pipe(Effect.mapError(mapError));
          if (!exists) {
            return defaultProfile;
          }

          const text = yield* fs.readFileString(filePath).pipe(Effect.mapError(mapError));
          return yield* Schema.decodeUnknownEffect(UserProfileFromJson)(text).pipe(
            Effect.catch(() => Effect.succeed(defaultProfile))
          );
        });

      const writeProfile = (profile: UserProfileType): Effect.Effect<void, UserProfileRepositoryError> =>
        Effect.gen(function* () {
          yield* ensureDirectory();
          const encoded = yield* Schema.encodeEffect(UserProfile)(profile).pipe(
            Effect.mapError(mapError)
          );
          yield* fs
            .writeFileString(filePath, JSON.stringify(encoded, null, 2))
            .pipe(Effect.mapError(mapError));
        });

      const getProfile = () => readProfile();

      const saveProfile = (input: UpdateUserProfileInput) =>
        Effect.gen(function* () {
          const current = yield* readProfile();
          const now = new Date().toISOString();

          const isCompleted =
            input.onboardingCompleted !== undefined
              ? input.onboardingCompleted
              : current.onboardingCompleted;

          const updated: UserProfileType = {
            ...current,
            ...Object.fromEntries(
              Object.entries(input).filter(([_, v]) => v !== undefined)
            ),
            onboardingCompleted: isCompleted,
            updatedAt: now,
            completedAt:
              isCompleted && !current.completedAt
                ? now
                : current.completedAt
          };

          yield* writeProfile(updated);
          return updated;
        });

      const clearProfile = () =>
        Effect.gen(function* () {
          yield* ensureDirectory();
          const exists = yield* fs.exists(filePath).pipe(Effect.mapError(mapError));
          if (exists) {
            yield* fs.remove(filePath).pipe(Effect.mapError(mapError));
          }
        });

      return {
        getProfile,
        saveProfile,
        clearProfile
      };
    }),

  layer: (directory: string) =>
    Layer.effect(UserProfileRepository, FileUserProfileRepository.make(directory))
};
