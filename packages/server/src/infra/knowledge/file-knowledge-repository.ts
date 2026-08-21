import { Effect, FileSystem, Layer, Path, Schema } from "effect";
import {
  type KnowledgeGapStatus,
  KnowledgeProfile,
  type KnowledgeGap as KnowledgeGapType,
  type KnowledgeProfile as KnowledgeProfileType
} from "@proxus/shared";
import {
  GapNotFound,
  KnowledgeRepository,
  KnowledgeRepositoryError,
  type KnowledgeRepository as KnowledgeRepositoryType
} from "../../domain/knowledge/knowledge-profile.ts";

const KnowledgeProfileFromJson = Schema.fromJsonString(KnowledgeProfile);

const defaultProfile: KnowledgeProfileType = {
  gaps: [],
  totalAttempts: 0
};

export const FileKnowledgeRepository = {
  make: (directory: string): Effect.Effect<KnowledgeRepositoryType, never, FileSystem.FileSystem | Path.Path> => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const profilePath = path.join(directory, "profile.json");
    const mapError = (reason: unknown) => new KnowledgeRepositoryError({ reason });

    const ensureDirectory = () => fs.makeDirectory(directory, { recursive: true }).pipe(
      Effect.mapError(mapError)
    );

    const readProfile = (): Effect.Effect<KnowledgeProfileType, KnowledgeRepositoryError> => Effect.gen(function* () {
      yield* ensureDirectory();
      const exists = yield* fs.exists(profilePath).pipe(Effect.mapError(mapError));
      if (!exists) {
        return defaultProfile;
      }

      const text = yield* fs.readFileString(profilePath).pipe(Effect.mapError(mapError));
      return yield* Schema.decodeUnknownEffect(KnowledgeProfileFromJson)(text).pipe(
        Effect.catch(() => Effect.succeed(defaultProfile))
      );
    });

    const writeProfile = (profile: KnowledgeProfileType): Effect.Effect<void, KnowledgeRepositoryError> => Effect.gen(function* () {
      yield* ensureDirectory();
      const encoded = yield* Schema.encodeEffect(KnowledgeProfile)(profile).pipe(Effect.mapError(mapError));
      yield* fs.writeFileString(profilePath, JSON.stringify(encoded, null, 2)).pipe(
        Effect.mapError(mapError)
      );
    });

    const getProfile = () => readProfile();

    const recordGaps = (newGaps: readonly KnowledgeGapType[]) => Effect.gen(function* () {
      const current = yield* readProfile();
      const now = new Date().toISOString();
      const updatedGaps = [...current.gaps];

      for (const gap of newGaps) {
        const existingIndex = updatedGaps.findIndex(
          (g) => g.id === gap.id || (g.sourceQuestionId === gap.sourceQuestionId && g.sourceArtifactId === gap.sourceArtifactId) || g.question === gap.question
        );

        if (existingIndex >= 0) {
          const existing = updatedGaps[existingIndex]!;
          updatedGaps[existingIndex] = {
            ...existing,
            studentAnswer: gap.studentAnswer,
            correctAnswer: gap.correctAnswer,
            explanation: gap.explanation,
            status: "active",
            failedAt: now
          };
        } else {
          updatedGaps.push({
            ...gap,
            status: "active",
            failedAt: now
          });
        }
      }

      const updatedProfile: KnowledgeProfileType = {
        gaps: updatedGaps,
        totalAttempts: current.totalAttempts + 1,
        lastAttemptAt: now
      };

      yield* writeProfile(updatedProfile);
      return updatedProfile;
    });

    const updateGapStatus = (id: string, status: KnowledgeGapStatus) => Effect.gen(function* () {
      const current = yield* readProfile();
      const index = current.gaps.findIndex((g) => g.id === id);
      if (index === -1) {
        return yield* new GapNotFound({ gapId: id });
      }

      const now = new Date().toISOString();
      const existing = current.gaps[index]!;
      const updatedGap: KnowledgeGapType = {
        ...existing,
        status,
        ...(status === "reviewing" ? { reviewedAt: now } : {}),
        ...(status === "mastered" ? { masteredAt: now } : {})
      };

      const updatedGaps = [...current.gaps];
      updatedGaps[index] = updatedGap;

      yield* writeProfile({
        ...current,
        gaps: updatedGaps
      });

      return updatedGap;
    });

    const clearProfile = () => writeProfile(defaultProfile);

    const listActiveGaps = () => readProfile().pipe(
      Effect.map((p) => p.gaps.filter((g) => g.status === "active" || g.status === "reviewing"))
    );

    return {
      getProfile,
      recordGaps,
      updateGapStatus,
      clearProfile,
      listActiveGaps
    };
  }),
  layer: (directory: string) => Layer.effect(KnowledgeRepository)(FileKnowledgeRepository.make(directory))
};
