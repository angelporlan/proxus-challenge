import { Effect, FileSystem, Layer, Option, Path, Schema } from "effect";
import type { KnowledgeGap } from "@proxus/shared";
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

const ArtifactFromJson = Schema.fromJsonString(Artifact);
const ArtifactAttemptFromJson = Schema.fromJsonString(ArtifactAttempt);

function extractKnowledgeGaps(artifact: ArtifactType, graded: ArtifactAttemptType): readonly KnowledgeGap[] {
  if (graded.status !== "graded" || (artifact.kind !== "quiz" && artifact.kind !== "test")) {
    return [];
  }

  const now = new Date().toISOString();
  const gaps: KnowledgeGap[] = [];

  for (const correction of graded.corrections) {
    // Only process questions that the student actually attempted/answered
    const studentAnswerProvided = graded.answers.some(
      (a) => a.questionId === correction.questionId && (
        a.questionType !== "multiple-choice" || (a.selectedOptionId && a.selectedOptionId.trim() !== "")
      )
    );
    if (!studentAnswerProvided) {
      continue;
    }

    let isIncorrect = false;
    let studentAns = "";
    let correctAns = "";
    let expl = "";

    if (correction.questionType === "multiple-choice") {
      isIncorrect = !correction.correct;
      const q = artifact.questions.find((item) => item.id === correction.questionId && item.type === "multiple-choice");
      const chosenOpt = q && "options" in q ? q.options.find((o) => o.id === correction.selectedOptionId)?.text ?? correction.selectedOptionId : correction.selectedOptionId;
      const correctOpt = q && "options" in q ? q.options.find((o) => o.id === correction.correctOptionId)?.text ?? correction.correctOptionId : correction.correctOptionId;
      studentAns = chosenOpt;
      correctAns = correctOpt;
      expl = correction.explanation;
    } else if (correction.questionType === "true-false") {
      isIncorrect = !correction.correct;
      studentAns = String(correction.answer);
      correctAns = String(correction.correctAnswer);
      expl = correction.explanation;
    } else if (correction.questionType === "short-answer") {
      isIncorrect = correction.score < correction.maxScore;
      const studentSub = graded.answers.find((a) => a.questionId === correction.questionId && a.questionType === "short-answer");
      studentAns = studentSub && "answer" in studentSub ? String(studentSub.answer) : "Respuesta enviada";
      const q = artifact.questions.find((item) => item.id === correction.questionId && item.type === "short-answer");
      correctAns = q && "expectedAnswer" in q ? String(q.expectedAnswer) : "Respuesta esperada";
      expl = correction.feedback;
    }

    if (isIncorrect) {
      const q = artifact.questions.find((item) => item.id === correction.questionId);
      const prompt = q ? q.prompt : `Pregunta ${correction.questionId}`;
      gaps.push({
        id: `gap-${artifact.id}-${correction.questionId}`,
        conceptId: correction.questionId,
        topic: artifact.title,
        question: prompt,
        studentAnswer: studentAns,
        correctAnswer: correctAns,
        explanation: expl,
        status: "active",
        failedAt: now,
        sourceArtifactId: artifact.id,
        sourceQuestionId: correction.questionId,
        ...(artifact.sourceMaterialId !== undefined
          ? { sourceMaterialId: artifact.sourceMaterialId }
          : {})
      });
    }
  }

  return gaps;
}

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
      yield* writeAttemptFile(graded);

      if (Option.isSome(knowledgeRepoOption)) {
        const knowledge = knowledgeRepoOption.value;
        const gaps = extractKnowledgeGaps(artifact, graded);
        if (gaps.length > 0) {
          yield* knowledge.recordGaps(gaps).pipe(Effect.catch(() => Effect.void));
        }
        yield* knowledge.recordCompletedAttempt().pipe(Effect.catch(() => Effect.void));
      }

      return graded;
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
