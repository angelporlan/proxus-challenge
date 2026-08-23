import { Effect, FileSystem, Layer, Option, Path, Schema } from "effect";
import {
  Artifact,
  ArtifactAttempt,
  ArtifactNotFound,
  ArtifactRepository,
  ArtifactRepositorySerializationError,
  ArtifactRepositoryStorageError,
  ArtifactTypeMismatch,
  AttemptNotFound,
  CreateArtifactInput,
  ListArtifactsInput,
  SubmitAttemptInput,
  gradeAttempt,
  makeArtifact,
  makeUngradedAttempt,
  type Artifact as ArtifactType,
  type ArtifactAttempt as ArtifactAttemptType,
  type ArtifactRepository as ArtifactRepositoryType,
  type ArtifactRepositoryError
} from "../../domain/artifacts/artifact.ts";
import { KnowledgeRepository } from "../../domain/knowledge/knowledge-profile.ts";
import { resolveGapTransitions } from "../../domain/knowledge/gap-progress.ts";

const ArtifactFromJson = Schema.fromJsonString(Artifact);
const ArtifactAttemptFromJson = Schema.fromJsonString(ArtifactAttempt);

export const FileArtifactRepository = {
  make: (directory: string): Effect.Effect<ArtifactRepositoryType, never, FileSystem.FileSystem | Path.Path | KnowledgeRepository> => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const knowledgeRepoOption = yield* Effect.serviceOption(KnowledgeRepository);

    const artifactsDirectory = path.join(directory, "artifacts");
    const attemptsDirectory = path.join(directory, "attempts");

    const artifactPath = (id: string) => path.join(artifactsDirectory, `${encodeURIComponent(id)}.json`);
    const attemptPath = (id: string) => path.join(attemptsDirectory, `${encodeURIComponent(id)}.json`);

    const mapStorageError = (reason: unknown) => new ArtifactRepositoryStorageError({ reason });
    const mapSerializationError = (reason: unknown) => new ArtifactRepositorySerializationError({ reason });

    const ensureDirectories = () => fs.makeDirectory(directory, { recursive: true }).pipe(
      Effect.andThen(fs.makeDirectory(artifactsDirectory, { recursive: true })),
      Effect.andThen(fs.makeDirectory(attemptsDirectory, { recursive: true })),
      Effect.mapError(mapStorageError)
    );

    const readArtifactFile = (id: string): Effect.Effect<ArtifactType, ArtifactRepositoryError> => Effect.gen(function* () {
      const filePath = artifactPath(id);
      const exists = yield* fs.exists(filePath).pipe(Effect.mapError(mapStorageError));
      if (!exists) {
        return yield* new ArtifactNotFound({ artifactId: id });
      }

      const text = yield* fs.readFileString(filePath).pipe(Effect.mapError(mapStorageError));
      return yield* Schema.decodeUnknownEffect(ArtifactFromJson)(text).pipe(
        Effect.mapError(mapSerializationError)
      );
    });

    const readAttemptFile = (id: string): Effect.Effect<ArtifactAttemptType, ArtifactRepositoryError> => Effect.gen(function* () {
      const filePath = attemptPath(id);
      const exists = yield* fs.exists(filePath).pipe(Effect.mapError(mapStorageError));
      if (!exists) {
        return yield* new AttemptNotFound({ attemptId: id });
      }

      const text = yield* fs.readFileString(filePath).pipe(Effect.mapError(mapStorageError));
      return yield* Schema.decodeUnknownEffect(ArtifactAttemptFromJson)(text).pipe(
        Effect.mapError(mapSerializationError)
      );
    });

    const writeArtifactFile = (artifact: ArtifactType) => Effect.gen(function* () {
      yield* ensureDirectories();
      const encoded = yield* Schema.encodeUnknownEffect(Artifact)(artifact).pipe(
        Effect.mapError(mapSerializationError)
      );
      const text = JSON.stringify(encoded, null, 2);
      yield* fs.writeFileString(artifactPath(artifact.id), text).pipe(Effect.mapError(mapStorageError));
    });

    const writeAttemptFile = (attempt: ArtifactAttemptType) => Effect.gen(function* () {
      yield* ensureDirectories();
      const encoded = yield* Schema.encodeUnknownEffect(ArtifactAttempt)(attempt).pipe(
        Effect.mapError(mapSerializationError)
      );
      const text = JSON.stringify(encoded, null, 2);
      yield* fs.writeFileString(attemptPath(attempt.id), text).pipe(Effect.mapError(mapStorageError));
    });

    const listFiles = (targetDirectory: string) => Effect.gen(function* () {
      yield* ensureDirectories();
      const exists = yield* fs.exists(targetDirectory).pipe(Effect.mapError(mapStorageError));
      if (!exists) {
        return [] as readonly string[];
      }
      return yield* fs.readDirectory(targetDirectory).pipe(Effect.mapError(mapStorageError));
    });

    const createArtifact = (input: CreateArtifactInput) => Effect.gen(function* () {
      const artifact = makeArtifact(input);
      yield* writeArtifactFile(artifact);
      return artifact;
    });

    const listArtifacts = (input: ListArtifactsInput = {}) => Effect.gen(function* () {
      const files = yield* listFiles(artifactsDirectory);
      const artifacts = yield* Effect.all(
        files.filter((file) => file.endsWith(".json")).map((file) => {
          const artifactId = decodeURIComponent(file.replace(/\.json$/, ""));
          return readArtifactFile(artifactId);
        })
      );
      return artifacts.filter((artifact) => input.kind === undefined || artifact.kind === input.kind);
    });

    const submitAttempt = (input: SubmitAttemptInput) => Effect.gen(function* () {
      const artifact = yield* readArtifactFile(input.artifactId);
      if (artifact.kind !== input.artifactKind) {
        return yield* new ArtifactTypeMismatch({
          artifactId: input.artifactId,
          expected: input.artifactKind,
          actual: artifact.kind
        });
      }

      const attempt = makeUngradedAttempt(input);
      yield* writeAttemptFile(attempt);
      return attempt;
    });

    const listAttempts = (artifactId?: string) => Effect.gen(function* () {
      const files = yield* listFiles(attemptsDirectory);
      const attempts = yield* Effect.all(
        files.filter((file) => file.endsWith(".json")).map((file) => {
          const attemptId = decodeURIComponent(file.replace(/\.json$/, ""));
          return readAttemptFile(attemptId);
        })
      );
      return attempts.filter((attempt) => artifactId === undefined || attempt.artifactId === artifactId);
    });

    const gradeAttemptById = (attemptId: string) => Effect.gen(function* () {
      const attempt = yield* readAttemptFile(attemptId);
      const artifact = yield* readArtifactFile(attempt.artifactId);
      const graded = yield* gradeAttempt(artifact, attempt);

      const transitions = Option.isSome(knowledgeRepoOption) && attempt.status === "ungraded" && graded.status === "graded"
        ? yield* knowledgeRepoOption.value.getProfile().pipe(
          Effect.map((profile) => resolveGapTransitions(artifact, graded, profile.gaps, new Date().toISOString())),
          Effect.catch(() => Effect.void)
        )
        : undefined;

      const persistedAttempt = transitions === undefined || graded.status !== "graded"
        ? graded
        : {
          ...graded,
          knowledgeUpdates: transitions.summary
        };

      yield* writeAttemptFile(persistedAttempt);

      if (Option.isSome(knowledgeRepoOption)) {
        const knowledge = knowledgeRepoOption.value;
        if (transitions !== undefined && transitions.upserts.length > 0) {
          yield* knowledge.applyTransitions(transitions.upserts).pipe(Effect.catch(() => Effect.void));
        }
        if (attempt.status === "ungraded") {
          yield* knowledge.recordCompletedAttempt().pipe(Effect.catch(() => Effect.void));
        }
      }

      return persistedAttempt;
    });

    const deleteArtifact = (id: string) => Effect.gen(function* () {
      const filePath = artifactPath(id);
      const exists = yield* fs.exists(filePath).pipe(Effect.mapError(mapStorageError));
      if (!exists) {
        return yield* new ArtifactNotFound({ artifactId: id });
      }
      yield* fs.remove(filePath).pipe(Effect.mapError(mapStorageError));

      // Knowledge gaps belong to the artifact that generated them. Remove them
      // together with the artifact so deleted quizzes/tests do not leave stale gaps.
      if (Option.isSome(knowledgeRepoOption)) {
        yield* knowledgeRepoOption.value.removeGapsByArtifactId(id).pipe(
          Effect.catch(() => Effect.void)
        );
      }
    });

    return {
      createArtifact,
      saveArtifact: writeArtifactFile,
      getArtifact: readArtifactFile,
      listArtifacts,
      deleteArtifact,
      submitAttempt,
      saveAttempt: writeAttemptFile,
      getAttempt: readAttemptFile,
      listAttempts,
      gradeAttempt: gradeAttemptById
    };
  }),
  layer: (directory: string) => Layer.effect(ArtifactRepository)(FileArtifactRepository.make(directory))
};
