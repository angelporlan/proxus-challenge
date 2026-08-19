import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type {
  Artifact,
  ArtifactAttempt,
  MultipleChoiceQuestion,
  QuestionCorrection,
  QuizQuestion,
  SubmitAttemptInput,
  TestQuestion
} from "@proxus/shared";
import { useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { artifactQuery, submitArtifactAttemptAction } from "../domain/artifacts/atoms.ts";

type Answers = Record<string, string>;

interface ArtifactWorkspaceProps {
  readonly artifactId: string | null;
  readonly onAskTutorAboutQuestion?: ((context: {
    question: string;
    studentAnswer: string;
    correctAnswer?: string | undefined;
    explanation?: string | undefined;
  }) => void) | undefined;
  readonly onOpenPdf?: ((materialId: string) => void) | undefined;
}

export function ArtifactWorkspace({
  artifactId,
  onAskTutorAboutQuestion
}: ArtifactWorkspaceProps) {
  if (artifactId === null) {
    return <EmptyWorkspace />;
  }

  return (
    <ArtifactDetail
      artifactId={artifactId}
      onAskTutorAboutQuestion={onAskTutorAboutQuestion}
    />
  );
}

function EmptyWorkspace() {
  return (
    <main className="h-full min-w-0 overflow-y-auto border-slate-800 border-r bg-slate-950/60 p-6 flex items-center justify-center">
      <div className="max-w-md text-center p-8 rounded-3xl border border-dashed border-slate-800 bg-slate-900/30">
        <div className="grid size-14 place-items-center rounded-2xl bg-indigo-600/10 text-indigo-400 mx-auto mb-4 border border-indigo-500/20">
          <span className="material-symbols-outlined text-2xl">menu_book</span>
        </div>
        <p className="font-bold text-indigo-400 text-xs uppercase tracking-widest mb-1">Espacio de Estudio</p>
        <h2 className="font-display font-bold text-2xl text-slate-100 mb-2">Selecciona un recurso</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Elige una nota de estudio, quiz o simulacro en la barra lateral, o pide al tutor de IA que genere uno a partir de tus PDFs.
        </p>
      </div>
    </main>
  );
}

function ArtifactDetail({
  artifactId,
  onAskTutorAboutQuestion
}: {
  readonly artifactId: string;
  readonly onAskTutorAboutQuestion?: ArtifactWorkspaceProps["onAskTutorAboutQuestion"];
}) {
  const artifact = useAtomValue(artifactQuery(artifactId));

  return (
    <main className="h-full min-w-0 overflow-y-auto border-slate-800 border-r bg-slate-950 p-4 sm:p-6">
      {AsyncResult.matchWithError(artifact, {
        onInitial: () => (
          <div className="flex items-center justify-center h-64 text-slate-400 gap-3">
            <div className="size-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent"></div>
            <p className="text-sm">Cargando recurso…</p>
          </div>
        ),
        onError: (error) => (
          <div className="p-4 rounded-2xl border border-red-900/60 bg-red-950/30 text-red-200 text-sm">
            {String(error)}
          </div>
        ),
        onDefect: (defect) => (
          <div className="p-4 rounded-2xl border border-red-900/60 bg-red-950/30 text-red-200 text-sm">
            {String(defect)}
          </div>
        ),
        onSuccess: ({ value }) => (
          <ArtifactContent
            artifact={value}
            onAskTutorAboutQuestion={onAskTutorAboutQuestion}
          />
        )
      })}
    </main>
  );
}

function ArtifactContent({
  artifact,
  onAskTutorAboutQuestion
}: {
  readonly artifact: Artifact;
  readonly onAskTutorAboutQuestion?: ArtifactWorkspaceProps["onAskTutorAboutQuestion"];
}) {
  switch (artifact.kind) {
    case "note":
      return <NoteViewer artifact={artifact} />;
    case "quiz":
    case "test":
      return (
        <ExerciseSolver
          artifact={artifact}
          onAskTutorAboutQuestion={onAskTutorAboutQuestion}
        />
      );
  }
}

function NoteViewer({ artifact }: { readonly artifact: Extract<Artifact, { readonly kind: "note" }> }) {
  const [copied, setCopied] = useState(false);

  const copyNote = () => {
    void navigator.clipboard.writeText(artifact.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl shadow-slate-950/50">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-indigo-600/20 text-indigo-400 font-mono text-xs">
            <span className="material-symbols-outlined text-sm">description</span>
          </span>
          <span className="font-bold text-indigo-400 text-xs uppercase tracking-widest">Nota de estudio</span>
        </div>
        <button
          type="button"
          onClick={copyNote}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition"
        >
          <span className="material-symbols-outlined text-xs">{copied ? "check" : "content_copy"}</span>
          <span>{copied ? "Copiado" : "Copiar"}</span>
        </button>
      </div>

      <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-100 mb-6">{artifact.title}</h2>

      <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed space-y-4">
        <Streamdown>{artifact.markdown}</Streamdown>
      </div>
    </article>
  );
}

function ExerciseSolver({
  artifact,
  onAskTutorAboutQuestion
}: {
  readonly artifact: Extract<Artifact, { readonly kind: "quiz" | "test" }>;
  readonly onAskTutorAboutQuestion?: ArtifactWorkspaceProps["onAskTutorAboutQuestion"];
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const [attempt, setAttempt] = useState<ArtifactAttempt | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExamMode, setIsExamMode] = useState(true);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Timer for exam simulation (e.g. 2 minutes per question default)
  const initialSeconds = artifact.questions.length * 90;
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [timerActive, setTimerActive] = useState(true);

  const submitAttempt = useAtomSet(submitArtifactAttemptAction, { mode: "promise" });

  useEffect(() => {
    if (!timerActive || attempt !== null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timerActive, attempt, timeLeft]);

  const unansweredQuestions = useMemo(
    () => artifact.questions.filter((question) => (answers[question.id] ?? "").trim().length === 0),
    [answers, artifact.questions]
  );

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const submit = async () => {
    if (unansweredQuestions.length > 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(undefined);
    setTimerActive(false);

    try {
      const payload = buildSubmitInput(artifact, answers);
      const result = await submitAttempt(payload);
      setAttempt(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder.toString().padStart(2, "0")}`;
  };

  const activeQuestion = artifact.questions[activeQuestionIndex] ?? artifact.questions[0];

  return (
    <article className="mx-auto max-w-3xl pb-12">
      {/* Exercise Header */}
      <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-indigo-600/20 text-indigo-400">
              <span className="material-symbols-outlined text-sm">
                {artifact.kind === "quiz" ? "quiz" : "timer"}
              </span>
            </span>
            <span className="font-bold text-indigo-400 text-xs uppercase tracking-widest">
              {artifact.kind === "quiz" ? "Quiz Rápido" : "Simulacro de Examen"}
            </span>
          </div>

          {/* Mode Switch & Timer */}
          <div className="flex items-center gap-2">
            {isExamMode && attempt === null && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                timeLeft < 60
                  ? "border-red-600 bg-red-950/60 text-red-300 animate-pulse"
                  : "border-slate-700 bg-slate-800 text-slate-200"
              }`}>
                <span className="material-symbols-outlined text-xs">timer</span>
                <span>{formatTimer(timeLeft)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsExamMode(!isExamMode)}
              className="px-2.5 py-1 text-xs rounded-full border border-slate-700 hover:border-slate-600 text-slate-300 transition"
            >
              {isExamMode ? "Vista Simulacro" : "Vista Lista"}
            </button>
          </div>
        </div>

        <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-100 mb-2">{artifact.title}</h2>
        <p className="text-slate-400 text-xs sm:text-sm">
          {artifact.questions.length} preguntas · Responde con atención y revisa las correcciones y explicaciones de la IA.
        </p>

        {/* Question Progress Tracker Pills */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5">
            {artifact.questions.map((q, idx) => {
              const isAnswered = (answers[q.id] ?? "").trim().length > 0;
              const isCurrent = idx === activeQuestionIndex;
              const correction = attempt?.status === "graded"
                ? attempt.corrections.find((item) => item.questionId === q.id)
                : undefined;

              let badgeColor = "bg-slate-800 text-slate-400 border-slate-700";
              if (correction) {
                if (correction.questionType === "short-answer") {
                  badgeColor = "bg-sky-950 text-sky-300 border-sky-600";
                } else {
                  badgeColor = correction.correct
                    ? "bg-emerald-950 text-emerald-300 border-emerald-600"
                    : "bg-red-950 text-red-300 border-red-600";
                }
              } else if (isCurrent) {
                badgeColor = "bg-indigo-600 text-white border-indigo-400";
              } else if (isAnswered) {
                badgeColor = "bg-indigo-950 text-indigo-300 border-indigo-800";
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setActiveQuestionIndex(idx)}
                  className={`size-7 rounded-lg text-xs font-mono font-semibold border flex items-center justify-center transition ${badgeColor}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] font-mono text-slate-400 shrink-0">
            {Object.keys(answers).length}/{artifact.questions.length} respondidas
          </span>
        </div>
      </header>

      {/* Questions view: Single Question in Exam Mode or List in Classic Mode */}
      {isExamMode && activeQuestion ? (
        <div className="space-y-4">
          <QuestionCard
            key={activeQuestion.id}
            index={activeQuestionIndex}
            totalQuestions={artifact.questions.length}
            question={activeQuestion}
            value={answers[activeQuestion.id] ?? ""}
            correction={
              attempt?.status === "graded"
                ? attempt.corrections.find((item) => item.questionId === activeQuestion.id)
                : undefined
            }
            disabled={attempt !== null}
            onChange={(value) => setAnswer(activeQuestion.id, value)}
            onAskTutorAboutQuestion={onAskTutorAboutQuestion}
          />

          {/* Stepper buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={activeQuestionIndex === 0}
              onClick={() => setActiveQuestionIndex((i) => Math.max(0, i - 1))}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Anterior</span>
            </button>
            <button
              type="button"
              disabled={activeQuestionIndex >= artifact.questions.length - 1}
              onClick={() => setActiveQuestionIndex((i) => Math.min(artifact.questions.length - 1, i + 1))}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Siguiente</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {artifact.questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              index={index}
              totalQuestions={artifact.questions.length}
              question={question}
              value={answers[question.id] ?? ""}
              correction={
                attempt?.status === "graded"
                  ? attempt.corrections.find((item) => item.questionId === question.id)
                  : undefined
              }
              disabled={attempt !== null}
              onChange={(value) => setAnswer(question.id, value)}
              onAskTutorAboutQuestion={onAskTutorAboutQuestion}
            />
          ))}
        </div>
      )}

      {error !== undefined && (
        <p className="mt-4 rounded-2xl border border-red-900 bg-red-950/50 p-4 text-red-100 text-sm">{error}</p>
      )}

      {attempt?.status === "graded" && <AttemptSummary attempt={attempt} />}

      {/* Sticky Bottom Actions */}
      <footer className="sticky bottom-4 mt-8 rounded-2xl border border-slate-800 bg-slate-950/95 p-4 backdrop-blur shadow-2xl z-10">
        {attempt === null ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-slate-400 text-xs sm:text-sm">
              {unansweredQuestions.length === 0
                ? "✓ Todas las preguntas contestadas. ¡Listo para entregar!"
                : `Faltan ${unansweredQuestions.length} pregunta(s) por responder.`}
            </p>
            <button
              className="rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-xs sm:text-sm text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 disabled:cursor-not-allowed disabled:opacity-40 transition"
              type="button"
              disabled={unansweredQuestions.length > 0 || isSubmitting}
              onClick={submit}
            >
              {isSubmitting ? "Corrigiendo examen…" : `Entregar ${artifact.kind}`}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-base">verified</span>
              <p className="font-semibold text-xs sm:text-sm text-emerald-200">
                Resultado corregido por el sistema
              </p>
            </div>
            <button
              className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2 text-xs font-semibold text-slate-200 hover:border-indigo-500 transition"
              type="button"
              onClick={() => {
                setAnswers({});
                setAttempt(null);
                setError(undefined);
                setTimeLeft(initialSeconds);
                setTimerActive(true);
                setActiveQuestionIndex(0);
              }}
            >
              Reintentar ejercicio
            </button>
          </div>
        )}
      </footer>
    </article>
  );
}

function QuestionCard({
  index,
  totalQuestions,
  question,
  value,
  correction,
  disabled,
  onChange,
  onAskTutorAboutQuestion
}: {
  readonly index: number;
  readonly totalQuestions: number;
  readonly question: QuizQuestion | TestQuestion;
  readonly value: string;
  readonly correction: QuestionCorrection | undefined;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
  readonly onAskTutorAboutQuestion?: ArtifactWorkspaceProps["onAskTutorAboutQuestion"];
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-xs text-indigo-400 font-semibold uppercase tracking-wider block mb-1">
            Pregunta {index + 1} de {totalQuestions} · {question.type}
          </span>
          <h3 className="font-display font-semibold text-base sm:text-lg text-slate-100 leading-snug">
            {question.prompt}
          </h3>
        </div>
        {correction !== undefined && <CorrectionBadge correction={correction} />}
      </div>

      {question.type === "multiple-choice" && (
        <MultipleChoiceInput question={question} value={value} disabled={disabled} onChange={onChange} />
      )}
      {question.type === "true-false" && (
        <TrueFalseInput value={value} disabled={disabled} onChange={onChange} />
      )}
      {question.type === "short-answer" && (
        <textarea
          className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3.5 text-slate-100 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-70 transition placeholder:text-slate-600"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="Escribe tu desarrollo o respuesta explicada…"
        />
      )}

      {correction !== undefined && (
        <CorrectionDetails
          correction={correction}
          question={question}
          studentAnswer={value}
          onAskTutorAboutQuestion={onAskTutorAboutQuestion}
        />
      )}
    </section>
  );
}

function MultipleChoiceInput({
  question,
  value,
  disabled,
  onChange
}: {
  readonly question: MultipleChoiceQuestion;
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2.5">
      {question.options.map((option) => {
        const isSelected = value === option.id;
        return (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition ${
              isSelected
                ? "border-indigo-500 bg-indigo-950/40 text-slate-100 shadow-sm"
                : "border-slate-800/80 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-950"
            }`}
          >
            <input
              type="radio"
              name={question.id}
              value={option.id}
              checked={isSelected}
              disabled={disabled}
              onChange={() => onChange(option.id)}
              className="accent-indigo-500 size-4"
            />
            <span className="text-sm">{option.text}</span>
          </label>
        );
      })}
    </div>
  );
}

function TrueFalseInput({
  value,
  disabled,
  onChange
}: {
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
      {([
        ["true", "Verdadero"],
        ["false", "Falso"]
      ] as const).map(([nextValue, label]) => {
        const isSelected = value === nextValue;
        return (
          <label
            key={nextValue}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition ${
              isSelected
                ? "border-indigo-500 bg-indigo-950/40 text-slate-100 shadow-sm"
                : "border-slate-800/80 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-950"
            }`}
          >
            <input
              type="radio"
              name={`true-false-${label}`}
              value={nextValue}
              checked={isSelected}
              disabled={disabled}
              onChange={() => onChange(nextValue)}
              className="accent-indigo-500 size-4"
            />
            <span className="text-sm font-medium">{label}</span>
          </label>
        );
      })}
    </div>
  );
}

function AttemptSummary({ attempt }: { readonly attempt: Extract<ArtifactAttempt, { readonly status: "graded" }> }) {
  const percentage = Math.round((attempt.score / attempt.maxScore) * 100);
  const isPassed = percentage >= 50;

  return (
    <section className={`mt-6 rounded-3xl border p-6 ${
      isPassed
        ? "border-emerald-800/60 bg-emerald-950/25"
        : "border-amber-800/60 bg-amber-950/25"
    }`}>
      <div className="flex items-center justify-between gap-4 mb-2">
        <p className="font-display font-bold text-xl sm:text-2xl text-slate-100">
          Nota: <span className={isPassed ? "text-emerald-400" : "text-amber-400"}>{attempt.score} / {attempt.maxScore}</span> ({percentage}%)
        </p>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
          isPassed ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
        }`}>
          {isPassed ? "Aprobado" : "Repaso Recomendado"}
        </span>
      </div>
      <p className="text-slate-300 text-sm leading-relaxed">{attempt.summary}</p>
    </section>
  );
}

function CorrectionBadge({ correction }: { readonly correction: QuestionCorrection }) {
  if (correction.questionType === "short-answer") {
    return (
      <span className="rounded-full bg-indigo-950 border border-indigo-700/60 px-3 py-1 font-mono text-xs font-bold text-indigo-300">
        {correction.score} / {correction.maxScore} pts
      </span>
    );
  }

  return correction.correct ? (
    <span className="rounded-full bg-emerald-950 border border-emerald-600/60 px-3 py-1 font-mono text-xs font-bold text-emerald-300 flex items-center gap-1">
      <span className="material-symbols-outlined text-xs">check</span>
      <span>Correcto</span>
    </span>
  ) : (
    <span className="rounded-full bg-red-950 border border-red-600/60 px-3 py-1 font-mono text-xs font-bold text-red-300 flex items-center gap-1">
      <span className="material-symbols-outlined text-xs">close</span>
      <span>Incorrecto</span>
    </span>
  );
}

function CorrectionDetails({
  correction,
  question,
  studentAnswer,
  onAskTutorAboutQuestion
}: {
  readonly correction: QuestionCorrection;
  readonly question: QuizQuestion | TestQuestion;
  readonly studentAnswer: string;
  readonly onAskTutorAboutQuestion?: ArtifactWorkspaceProps["onAskTutorAboutQuestion"];
}) {
  const isIncorrect = "correct" in correction ? !correction.correct : (correction.score < correction.maxScore);

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs sm:text-sm">
      {correction.questionType === "multiple-choice" && question.type === "multiple-choice" && (
        <>
          <p className="text-slate-300">
            Respuesta correcta: <strong className="text-emerald-400">{optionText(question, correction.correctOptionId)}</strong>
          </p>
          <p className="mt-2 text-slate-400 leading-relaxed">{correction.explanation}</p>
        </>
      )}
      {correction.questionType === "true-false" && (
        <>
          <p className="text-slate-300">
            Respuesta correcta: <strong className="text-emerald-400">{correction.correctAnswer ? "Verdadero" : "Falso"}</strong>
          </p>
          <p className="mt-2 text-slate-400 leading-relaxed">{correction.explanation}</p>
        </>
      )}
      {correction.questionType === "short-answer" && (
        <p className="text-slate-300 leading-relaxed">{correction.feedback}</p>
      )}

      {/* Button to ask tutor directly about this question/mistake */}
      {isIncorrect && onAskTutorAboutQuestion && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">¿Dudas con este resultado?</span>
          <button
            type="button"
            onClick={() => {
              const correctAnswer =
                correction.questionType === "multiple-choice" && question.type === "multiple-choice"
                  ? optionText(question, correction.correctOptionId)
                  : correction.questionType === "true-false"
                  ? correction.correctAnswer ? "Verdadero" : "Falso"
                  : undefined;

              const explanation =
                correction.questionType === "short-answer"
                  ? correction.feedback
                  : correction.explanation;

              onAskTutorAboutQuestion({
                question: question.prompt,
                studentAnswer,
                correctAnswer,
                explanation
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
          >
            <span className="material-symbols-outlined text-xs">psychology</span>
            <span>Preguntar al tutor sobre este fallo</span>
          </button>
        </div>
      )}
    </div>
  );
}

const optionText = (question: MultipleChoiceQuestion, optionId: string) =>
  question.options.find((option) => option.id === optionId)?.text ?? optionId;

function buildSubmitInput(
  artifact: Extract<Artifact, { readonly kind: "quiz" | "test" }>,
  answers: Answers
): SubmitAttemptInput {
  const builtAnswers = artifact.questions.map((question) => {
    const value = answers[question.id] ?? "";
    switch (question.type) {
      case "multiple-choice":
        return {
          questionType: "multiple-choice" as const,
          questionId: question.id,
          selectedOptionId: value
        };
      case "true-false":
        return {
          questionType: "true-false" as const,
          questionId: question.id,
          answer: value === "true"
        };
      case "short-answer":
        return {
          questionType: "short-answer" as const,
          questionId: question.id,
          answer: value
        };
    }
  });

  if (artifact.kind === "quiz") {
    return {
      artifactKind: "quiz",
      artifactId: artifact.id,
      answers: builtAnswers.filter((answer) => answer.questionType !== "short-answer")
    };
  }

  return {
    artifactKind: "test",
    artifactId: artifact.id,
    answers: builtAnswers
  };
}
