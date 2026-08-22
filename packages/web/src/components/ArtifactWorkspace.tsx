import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type {
  Artifact,
  ArtifactAttempt,
  MultipleChoiceQuestion,
  QuestionCorrection,
  QuizArtifact,
  QuizQuestion,
  SubmitAttemptInput,
  TestArtifact,
  TestQuestion
} from "@proxus/shared";
import { useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { artifactQuery, submitArtifactAttemptAction } from "../domain/artifacts/atoms.ts";
import { Button, Dialog } from "./ui/index.ts";

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

export function ArtifactWorkspace({ artifactId, onAskTutorAboutQuestion }: ArtifactWorkspaceProps) {
  if (artifactId === null) return <EmptyWorkspace />;
  return <ArtifactDetail artifactId={artifactId} onAskTutorAboutQuestion={onAskTutorAboutQuestion} />;
}

function EmptyWorkspace() {
  return (
    <main className="flex h-full min-w-0 items-center justify-center overflow-y-auto p-6">
      <div className="max-w-md rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-xl border border-indigo-500/20 bg-indigo-600/10 text-indigo-500"><span className="material-symbols-outlined text-2xl">menu_book</span></div>
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-indigo-500">Espacio de Estudio</p>
        <h2 className="mb-2 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Selecciona un recurso</h2>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">Elige una nota, un quiz o un simulacro en la biblioteca, o pide al tutor que prepare uno a partir de tus PDFs.</p>
      </div>
    </main>
  );
}

function ArtifactDetail({ artifactId, onAskTutorAboutQuestion }: { readonly artifactId: string; readonly onAskTutorAboutQuestion?: ArtifactWorkspaceProps["onAskTutorAboutQuestion"] }) {
  const query = artifactQuery(artifactId);
  const artifact = useAtomValue(query);
  const refresh = useAtomRefresh(query);
  return (
    <main className="h-full min-w-0 overflow-y-auto p-4 sm:p-6">
      {AsyncResult.matchWithError(artifact, {
        onInitial: () => <div className="flex h-64 items-center justify-center gap-3 text-slate-400"><div className="size-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" /><p className="text-sm">Cargando recurso…</p></div>,
        onError: () => <ArtifactLoadError onRetry={refresh} />,
        onDefect: () => <ArtifactLoadError onRetry={refresh} />,
        onSuccess: ({ value }) => <ArtifactContent key={value.id} artifact={value} onAskTutorAboutQuestion={onAskTutorAboutQuestion} />
      })}
    </main>
  );
}

function ArtifactLoadError({ onRetry }: { readonly onRetry: () => void }) {
  return <div className="flex min-h-64 items-center justify-center text-center"><div className="max-w-sm"><span className="material-symbols-outlined text-3xl text-red-500" aria-hidden="true">error</span><h2 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">No se pudo abrir el recurso</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Comprueba la conexión y vuelve a intentarlo.</p><button type="button" className="ui-secondary-action mt-4" onClick={onRetry}>Reintentar</button></div></div>;
}

function ArtifactContent({ artifact, onAskTutorAboutQuestion }: { readonly artifact: Artifact; readonly onAskTutorAboutQuestion?: ArtifactWorkspaceProps["onAskTutorAboutQuestion"] }) {
  switch (artifact.kind) {
    case "note": return <NoteViewer key={artifact.id} artifact={artifact} />;
    case "quiz": return <QuizWorkspace key={artifact.id} artifact={artifact} onAskTutorAboutQuestion={onAskTutorAboutQuestion} />;
    case "test": return <ExamWorkspace key={artifact.id} artifact={artifact} onAskTutorAboutQuestion={onAskTutorAboutQuestion} />;
  }
}

function NoteViewer({ artifact }: { readonly artifact: Extract<Artifact, { readonly kind: "note" }> }) {
  const [copied, setCopied] = useState(false);
  const copyNote = () => { void navigator.clipboard.writeText(artifact.markdown); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <article className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-8">
      <div className="mb-4 flex items-center justify-between gap-4"><div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-600/20 dark:text-indigo-400"><span className="material-symbols-outlined text-sm">description</span></span><span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Nota de estudio</span></div><button type="button" onClick={copyNote} className="flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"><span className="material-symbols-outlined text-xs">{copied ? "check" : "content_copy"}</span><span>{copied ? "Copiado" : "Copiar"}</span></button></div>
      <h2 className="mb-6 font-display text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{artifact.title}</h2>
      <div className="prose max-w-none space-y-4 leading-relaxed text-slate-700 dark:prose-invert dark:text-slate-300"><Streamdown>{artifact.markdown}</Streamdown></div>
    </article>
  );
}

function QuizWorkspace({ artifact, onAskTutorAboutQuestion }: { readonly artifact: QuizArtifact; readonly onAskTutorAboutQuestion?: ArtifactWorkspaceProps["onAskTutorAboutQuestion"] }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [attempt, setAttempt] = useState<ArtifactAttempt | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitAttempt = useAtomSet(submitArtifactAttemptAction, { mode: "promise" });
  const unansweredQuestions = useMemo(() => artifact.questions.filter((question) => !isAnswerProvided(answers[question.id])), [answers, artifact.questions]);
  const setAnswer = (questionId: string, value: string) => { if (attempt === null) setAnswers((current) => ({ ...current, [questionId]: value })); };
  const submit = async () => {
    if (unansweredQuestions.length > 0 || isSubmitting || attempt !== null) return;
    setIsSubmitting(true); setError(undefined);
    try { setAttempt(await submitAttempt(buildSubmitInput(artifact, answers))); } catch { setError("No se pudo guardar el resultado. Comprueba la conexión e inténtalo de nuevo."); } finally { setIsSubmitting(false); }
  };
  const reset = () => { setAnswers({}); setAttempt(null); setError(undefined); };

  return (
    <article className="mx-auto max-w-3xl pb-12">
      <header className="mb-5 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 p-5 shadow-sm dark:border-purple-900/60 dark:from-purple-950/50 dark:via-slate-900/95 dark:to-fuchsia-950/30 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-300"><span className="grid size-8 place-items-center rounded-xl bg-purple-600 text-white shadow-sm"><span className="material-symbols-outlined text-base">quiz</span></span>Quiz de práctica</div><h2 className="font-display text-2xl font-bold text-slate-950 dark:text-slate-50 sm:text-3xl">{artifact.title}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">Responde a tu ritmo. Recibirás la explicación inmediatamente para reforzar cada concepto.</p></div><div className="rounded-xl border border-purple-200 bg-white/80 px-3 py-2 text-right text-xs dark:border-purple-800/60 dark:bg-purple-950/40"><span className="block font-mono text-lg font-bold text-purple-700 dark:text-purple-200">{artifact.questions.length}</span><span className="text-slate-500 dark:text-slate-400">preguntas</span></div></div>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><span className="rounded-full bg-purple-100 px-2.5 py-1 font-semibold text-purple-700 dark:bg-purple-900/60 dark:text-purple-200">Feedback inmediato</span><span className="rounded-full bg-white/80 px-2.5 py-1 dark:bg-slate-900/70">Sin límite de tiempo</span><span>{artifact.questions.length - unansweredQuestions.length}/{artifact.questions.length} respondidas</span></div>
      </header>
      <div className="grid gap-4">{artifact.questions.map((question, index) => <PracticeQuestionCard key={`${question.id}-${index}`} index={index} question={question} value={answers[question.id] ?? ""} disabled={attempt !== null || isAnswerProvided(answers[question.id])} correction={attempt?.status === "graded" ? attempt.corrections.find((item) => item.questionId === question.id) : undefined} onChange={(value) => setAnswer(question.id, value)} onAskTutorAboutQuestion={onAskTutorAboutQuestion} />)}</div>
      {error !== undefined && <ErrorMessage>{error}</ErrorMessage>}
      {attempt?.status === "graded" ? <PracticeResult attempt={attempt} onRetry={reset} /> : <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-purple-200 bg-white p-4 dark:border-purple-900/60 dark:bg-slate-900/80"><div className="text-xs text-slate-500 dark:text-slate-400">{unansweredQuestions.length === 0 ? "Todo listo para revisar tu resultado." : `Te quedan ${unansweredQuestions.length} pregunta(s).`}</div><Button onClick={() => void submit()} disabled={unansweredQuestions.length > 0 || isSubmitting} loading={isSubmitting} leadingIcon={<span className="material-symbols-outlined text-sm">auto_awesome</span>}>Corregir quiz</Button></footer>}
    </article>
  );
}

function PracticeQuestionCard({ index, question, value, disabled, correction, onChange, onAskTutorAboutQuestion }: { readonly index: number; readonly question: QuizQuestion; readonly value: string; readonly disabled: boolean; readonly correction: QuestionCorrection | undefined; readonly onChange: (value: string) => void; readonly onAskTutorAboutQuestion?: ArtifactWorkspaceProps["onAskTutorAboutQuestion"] }) {
  const answered = isAnswerProvided(value);
  const isCorrect = answered && questionCorrect(question, value);
  return (
    <section className={`rounded-2xl border bg-white p-5 shadow-sm transition dark:bg-slate-900/90 sm:p-6 ${answered ? isCorrect ? "border-emerald-300 dark:border-emerald-800/70" : "border-amber-300 dark:border-amber-800/70" : "border-slate-200 dark:border-slate-800"}`}>
      <div className="mb-4 flex items-start justify-between gap-4"><div><span className="mb-1 block font-mono text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Pregunta {index + 1} · {question.type === "multiple-choice" ? "opción múltiple" : "verdadero o falso"}</span><h3 className="font-display text-base font-semibold leading-snug text-slate-900 dark:text-slate-100 sm:text-lg">{question.prompt}</h3></div>{answered && <span className={`rounded-full px-3 py-1 text-xs font-bold ${isCorrect ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>{isCorrect ? "Correcto" : "Repasar"}</span>}</div>
      {question.type === "multiple-choice" ? <PracticeMultipleChoice question={question} value={value} disabled={disabled} onChange={onChange} /> : <PracticeTrueFalse value={value} disabled={disabled} onChange={onChange} />}
      {correction !== undefined ? <CorrectionDetails correction={correction} question={question} studentAnswer={value} onAskTutorAboutQuestion={onAskTutorAboutQuestion} /> : answered ? <PracticeFeedback question={question} value={value} isCorrect={isCorrect} /> : null}
    </section>
  );
}

function PracticeMultipleChoice({ question, value, disabled, onChange }: { readonly question: MultipleChoiceQuestion; readonly value: string; readonly disabled: boolean; readonly onChange: (value: string) => void }) {
  return <div className="grid gap-2.5">{question.options.map((option, index) => { const selected = value === option.id; return <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition ${selected ? "border-purple-500 bg-purple-50 text-slate-900 shadow-sm dark:bg-purple-950/40 dark:text-slate-100" : "border-slate-200 bg-slate-50/60 text-slate-700 hover:border-purple-300 hover:bg-purple-50/50 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-purple-800"}`}><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-purple-100 font-mono text-xs font-bold text-purple-700 dark:bg-purple-900/60 dark:text-purple-200">{String.fromCharCode(65 + index)}</span><input type="radio" name={`practice-${question.id}`} value={option.id} checked={selected} disabled={disabled} onChange={() => onChange(option.id)} className="sr-only" /><span className="text-sm">{option.text}</span></label>; })}</div>;
}

function PracticeTrueFalse({ value, disabled, onChange }: { readonly value: string; readonly disabled: boolean; readonly onChange: (value: string) => void }) {
  return <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">{(["true", "false"] as const).map((nextValue) => { const selected = value === nextValue; return <label key={nextValue} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3.5 text-sm font-semibold transition ${selected ? "border-purple-500 bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-100" : "border-slate-200 bg-slate-50/60 text-slate-700 hover:border-purple-300 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300"}`}><input type="radio" name={`practice-${nextValue}`} value={nextValue} checked={selected} disabled={disabled} onChange={() => onChange(nextValue)} className="accent-purple-600" /><span>{nextValue === "true" ? "Verdadero" : "Falso"}</span></label>; })}</div>;
}

function PracticeFeedback({ question, value, isCorrect }: { readonly question: QuizQuestion; readonly value: string; readonly isCorrect: boolean }) {
  const correctAnswer = question.type === "multiple-choice" ? optionText(question, question.correctOptionId) : question.correctAnswer ? "Verdadero" : "Falso";
  return <div className={`mt-4 rounded-xl border p-4 text-sm ${isCorrect ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"}`}><p className="font-bold">{isCorrect ? "¡Correcto!" : `La respuesta correcta es: ${correctAnswer}`}</p><p className="mt-1 leading-relaxed">{question.explanation}</p>{!isCorrect && value !== "" && <span className="mt-2 block text-xs opacity-80">Tu respuesta: {question.type === "multiple-choice" ? optionText(question, value) : value === "true" ? "Verdadero" : "Falso"}</span>}</div>;
}

function PracticeResult({ attempt, onRetry }: { readonly attempt: Extract<ArtifactAttempt, { readonly status: "graded" }>; readonly onRetry: () => void }) {
  const percentage = attempt.maxScore === 0 ? 0 : Math.round((attempt.score / attempt.maxScore) * 100);
  const incorrect = attempt.corrections.filter((correction) => correction.questionType === "short-answer" ? correction.score < correction.maxScore : !correction.correct).length;
  return <section className="mt-6 rounded-2xl border border-purple-200 bg-purple-50/70 p-6 dark:border-purple-900/60 dark:bg-purple-950/25"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-300">Resultado del quiz</p><p className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-slate-100">{attempt.score}/{attempt.maxScore} <span className="text-base font-medium text-slate-500">({percentage}%)</span></p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-purple-700 dark:bg-slate-900 dark:text-purple-200">{incorrect === 0 ? "Dominado" : `${incorrect} para repasar`}</span></div><p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{incorrect === 0 ? "Buen trabajo. Puedes avanzar al siguiente concepto." : "Revisa las explicaciones marcadas y vuelve a intentarlo para consolidar el concepto."}</p><Button variant="secondary" className="mt-5" onClick={onRetry} leadingIcon={<span className="material-symbols-outlined text-sm">refresh</span>}>Reintentar quiz</Button></section>;
}

function ExamWorkspace({ artifact, onAskTutorAboutQuestion }: { readonly artifact: TestArtifact; readonly onAskTutorAboutQuestion?: ArtifactWorkspaceProps["onAskTutorAboutQuestion"] }) {
  const initialSeconds = Math.max(300, artifact.questions.length * 90);
  const [answers, setAnswers] = useState<Answers>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<ReadonlySet<string>>(() => new Set());
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [attempt, setAttempt] = useState<ArtifactAttempt | null>(null);
  const [elapsedAtSubmit, setElapsedAtSubmit] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const submitAttempt = useAtomSet(submitArtifactAttemptAction, { mode: "promise" });
  const activeQuestion = artifact.questions[activeQuestionIndex] ?? artifact.questions[0];
  const unansweredQuestions = useMemo(() => artifact.questions.filter((question) => !isAnswerProvided(answers[question.id])), [answers, artifact.questions]);
  const isExpired = timeLeft <= 0 && attempt === null;

  useEffect(() => {
    if (attempt !== null || isSubmitting || timeLeft <= 0) return;
    const timer = window.setInterval(() => setTimeLeft((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [attempt, isSubmitting, timeLeft]);

  const submitExam = async (force: boolean) => {
    if (isSubmitting || attempt !== null) return;
    if (!force && (unansweredQuestions.length > 0 || flaggedQuestions.size > 0)) { setShowSubmitDialog(true); return; }
    setIsSubmitting(true); setError(undefined); setShowSubmitDialog(false); setElapsedAtSubmit(initialSeconds - Math.max(0, timeLeft));
    try { setAttempt(await submitAttempt(buildSubmitInput(artifact, answers))); } catch { setError("No se pudo entregar el examen. Comprueba la conexión e inténtalo de nuevo."); } finally { setIsSubmitting(false); }
  };

  useEffect(() => { if (timeLeft === 0 && attempt === null && !isSubmitting) void submitExam(true); }, [attempt, isSubmitting, timeLeft]);

  const setAnswer = (questionId: string, value: string) => { if (attempt === null) setAnswers((current) => ({ ...current, [questionId]: value })); };
  const toggleFlag = (questionId: string) => { if (attempt !== null) return; setFlaggedQuestions((current) => { const next = new Set(current); if (next.has(questionId)) next.delete(questionId); else next.add(questionId); return next; }); };
  const reset = () => { setAnswers({}); setFlaggedQuestions(new Set()); setActiveQuestionIndex(0); setTimeLeft(initialSeconds); setAttempt(null); setElapsedAtSubmit(null); setError(undefined); setShowSubmitDialog(false); };
  const timerTone = timeLeft < 60 ? "urgent" : timeLeft < 180 ? "warning" : "normal";

  return (
    <article className="mx-auto max-w-4xl pb-12">
      <header className="mb-4 border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950"><div className="border-b-4 border-slate-800 px-5 py-5 dark:border-slate-200 sm:px-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Evaluación oficial · Simulacro de examen</p><h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl">{artifact.title}</h2><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Material base: recurso de estudio seleccionado · Ponderación: 10 puntos</p></div><div className="border border-slate-300 px-4 py-3 text-right dark:border-slate-700"><span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Candidato</span><span className="font-serif text-sm font-semibold text-slate-800 dark:text-slate-200">Alumno</span></div></div></div><div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/95 px-5 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-8"><div className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-sm font-bold ${timerTone === "urgent" ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300" : timerTone === "warning" ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"}`}><span className="material-symbols-outlined text-base">timer</span><span>{isExpired ? "Tiempo agotado" : formatTimer(timeLeft)}</span></div><div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300"><span><strong className="text-slate-900 dark:text-slate-100">{artifact.questions.length - unansweredQuestions.length}</strong> respondidas</span><span><strong className="text-slate-900 dark:text-slate-100">{unansweredQuestions.length}</strong> pendientes</span><span><strong className="text-amber-600 dark:text-amber-400">{flaggedQuestions.size}</strong> marcadas</span></div></div></header>
      <div className="mb-4 flex items-center gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/90"><span className="mr-1 shrink-0 text-[11px] font-bold uppercase tracking-widest text-slate-500">Navegación</span>{artifact.questions.map((question, index) => { const answered = isAnswerProvided(answers[question.id]); const flagged = flaggedQuestions.has(question.id); return <button key={`${question.id}-${index}`} type="button" onClick={() => setActiveQuestionIndex(index)} disabled={attempt !== null} aria-label={`Ir a la pregunta ${index + 1}`} className={`relative grid size-8 shrink-0 place-items-center rounded-md border text-xs font-bold transition ${index === activeQuestionIndex ? "border-indigo-600 bg-indigo-600 text-white" : flagged ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300" : answered ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300" : "border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"}`}>{index + 1}{flagged && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-amber-500" />}</button>; })}</div>
      {activeQuestion && <ExamQuestionCard index={activeQuestionIndex} totalQuestions={artifact.questions.length} question={activeQuestion} value={answers[activeQuestion.id] ?? ""} disabled={attempt !== null} flagged={flaggedQuestions.has(activeQuestion.id)} correction={attempt?.status === "graded" ? attempt.corrections.find((item) => item.questionId === activeQuestion.id) : undefined} onChange={(value) => setAnswer(activeQuestion.id, value)} onToggleFlag={() => toggleFlag(activeQuestion.id)} onAskTutorAboutQuestion={onAskTutorAboutQuestion} />}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><Button variant="secondary" disabled={activeQuestionIndex === 0 || attempt !== null} onClick={() => setActiveQuestionIndex((current) => Math.max(0, current - 1))} leadingIcon={<span className="material-symbols-outlined text-sm">arrow_back</span>}>Anterior</Button>{attempt === null ? <Button onClick={() => void submitExam(false)} disabled={isSubmitting || isExpired} loading={isSubmitting} trailingIcon={<span className="material-symbols-outlined text-sm">send</span>}>Entregar y Calificar Examen</Button> : <Button variant="secondary" onClick={reset} leadingIcon={<span className="material-symbols-outlined text-sm">refresh</span>}>Repetir simulacro</Button>}<Button variant="secondary" disabled={activeQuestionIndex >= artifact.questions.length - 1 || attempt !== null} onClick={() => setActiveQuestionIndex((current) => Math.min(artifact.questions.length - 1, current + 1))} trailingIcon={<span className="material-symbols-outlined text-sm">arrow_forward</span>}>Siguiente</Button></div>
      {isExpired && attempt === null && <p className="mt-3 text-center text-xs font-semibold text-red-600 dark:text-red-400">El tiempo ha terminado. El examen se está entregando automáticamente.</p>}
      {error !== undefined && <ErrorMessage>{error}</ErrorMessage>}
      {attempt?.status === "graded" && <ExamActa artifact={artifact} attempt={attempt} elapsedSeconds={elapsedAtSubmit ?? initialSeconds - timeLeft} />}
      <ExamSubmitDialog open={showSubmitDialog} unansweredCount={unansweredQuestions.length} flaggedCount={flaggedQuestions.size} onCancel={() => setShowSubmitDialog(false)} onConfirm={() => void submitExam(true)} />
    </article>
  );
}

function ExamQuestionCard({ index, totalQuestions, question, value, disabled, flagged, correction, onChange, onToggleFlag, onAskTutorAboutQuestion }: { readonly index: number; readonly totalQuestions: number; readonly question: TestQuestion; readonly value: string; readonly disabled: boolean; readonly flagged: boolean; readonly correction: QuestionCorrection | undefined; readonly onChange: (value: string) => void; readonly onToggleFlag: () => void; readonly onAskTutorAboutQuestion?: ArtifactWorkspaceProps["onAskTutorAboutQuestion"] }) {
  return <section className="border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950 sm:p-8"><div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800"><div><span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Pregunta {index + 1} de {totalQuestions}</span><h3 className="mt-2 font-serif text-xl font-semibold leading-snug text-slate-950 dark:text-slate-50">{question.prompt}</h3></div><button type="button" onClick={onToggleFlag} disabled={disabled} aria-pressed={flagged} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${flagged ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300" : "border-slate-300 text-slate-500 hover:border-amber-400 hover:text-amber-600 dark:border-slate-700 dark:text-slate-400"}`}><span className="material-symbols-outlined text-sm">flag</span><span>{flagged ? "Marcada" : "Marcar"}</span></button></div>{question.type === "multiple-choice" && <ExamMultipleChoice question={question} value={value} disabled={disabled} onChange={onChange} />}{question.type === "true-false" && <ExamTrueFalse value={value} disabled={disabled} onChange={onChange} />}{question.type === "short-answer" && <div><div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400"><span>Desarrollo de la respuesta</span><span>{value.length}/2000 caracteres</span></div><textarea value={value} maxLength={2000} disabled={disabled} onChange={(event) => onChange(event.currentTarget.value)} placeholder="Redacta tu respuesta con argumentos y conceptos clave…" className="min-h-44 w-full resize-y rounded-lg border border-slate-300 bg-slate-50 p-4 font-serif text-sm leading-relaxed text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" /><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Criterio: responde de forma clara, justifica tu razonamiento y utiliza la terminología del temario.</p></div>}{correction !== undefined && <CorrectionDetails correction={correction} question={question} studentAnswer={value} onAskTutorAboutQuestion={onAskTutorAboutQuestion} />}</section>;
}

function ExamMultipleChoice({ question, value, disabled, onChange }: { readonly question: MultipleChoiceQuestion; readonly value: string; readonly disabled: boolean; readonly onChange: (value: string) => void }) {
  return <div className="grid gap-3">{question.options.map((option, index) => { const selected = value === option.id; return <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${selected ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "border-slate-200 bg-slate-50/50 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900/50"}`}><input type="radio" name={`exam-${question.id}`} value={option.id} checked={selected} disabled={disabled} onChange={() => onChange(option.id)} className="accent-indigo-600 size-4" /><span className="font-mono text-xs font-bold text-slate-500">{String.fromCharCode(65 + index)}.</span><span className="text-sm text-slate-800 dark:text-slate-200">{option.text}</span></label>; })}</div>;
}

function ExamTrueFalse({ value, disabled, onChange }: { readonly value: string; readonly disabled: boolean; readonly onChange: (value: string) => void }) {
  return <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">{(["true", "false"] as const).map((nextValue) => <label key={nextValue} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm font-semibold transition ${value === nextValue ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50"}`}><input type="radio" name="exam-true-false" value={nextValue} checked={value === nextValue} disabled={disabled} onChange={() => onChange(nextValue)} className="accent-indigo-600 size-4" /><span>{nextValue === "true" ? "Verdadero" : "Falso"}</span></label>)}</div>;
}

function ExamActa({ artifact, attempt, elapsedSeconds }: { readonly artifact: TestArtifact; readonly attempt: Extract<ArtifactAttempt, { readonly status: "graded" }>; readonly elapsedSeconds: number }) {
  const percentage = attempt.maxScore === 0 ? 0 : Math.round((attempt.score / attempt.maxScore) * 100);
  const scoreOnTen = attempt.maxScore === 0 ? 0 : (attempt.score / attempt.maxScore) * 10;
  const distinction = scoreOnTen < 5 ? "No apto" : scoreOnTen < 7 ? "Aprobado" : scoreOnTen < 9 ? "Notable" : "Sobresaliente";
  const incorrectCount = attempt.corrections.filter((correction) => correction.questionType === "short-answer" ? correction.score < correction.maxScore : !correction.correct).length;
  return <section className="mt-6 border-2 border-slate-800 bg-white p-5 shadow-sm dark:border-slate-200 dark:bg-slate-950 sm:p-8"><div className="border-b-2 border-slate-800 pb-4 dark:border-slate-200"><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Acta oficial de calificación</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h3 className="font-serif text-2xl font-bold text-slate-950 dark:text-slate-50">{distinction}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{artifact.title}</p></div><div className="text-right"><span className="block font-serif text-4xl font-bold text-indigo-700 dark:text-indigo-300">{scoreOnTen.toFixed(1)}<small className="text-lg">/10</small></span><span className="text-xs text-slate-500">{percentage}% global</span></div></div></div><div className="grid gap-3 py-4 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-3"><div><span className="block text-xs uppercase tracking-wider text-slate-500">Tiempo invertido</span><strong>{formatDuration(elapsedSeconds)}</strong></div><div><span className="block text-xs uppercase tracking-wider text-slate-500">Preguntas</span><strong>{attempt.score}/{attempt.maxScore} correctas</strong></div><div><span className="block text-xs uppercase tracking-wider text-slate-500">Lagunas generadas</span><strong>{incorrectCount}</strong></div></div><div className="border-t border-slate-200 pt-4 dark:border-slate-800"><h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Desglose de la prueba</h4><div className="grid gap-2">{artifact.questions.map((question, index) => { const correction = attempt.corrections.find((item) => item.questionId === question.id); const correct = correction !== undefined && (correction.questionType === "short-answer" ? correction.score >= correction.maxScore : correction.correct); return <div key={`${question.id}-${index}`} className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800"><span className={`material-symbols-outlined mt-0.5 text-sm ${correct ? "text-emerald-500" : "text-red-500"}`}>{correct ? "check_circle" : "cancel"}</span><span className="flex-1 text-slate-700 dark:text-slate-300">{index + 1}. {question.prompt}</span><span className="font-semibold text-slate-500">{correct ? "Correcta" : "Revisar"}</span></div>; })}</div></div></section>;
}

function ExamSubmitDialog({ open, unansweredCount, flaggedCount, onCancel, onConfirm }: { readonly open: boolean; readonly unansweredCount: number; readonly flaggedCount: number; readonly onCancel: () => void; readonly onConfirm: () => void }) {
  return <Dialog open={open} onClose={onCancel} title="Confirmar entrega del examen" description="La entrega corregirá las respuestas actuales y cerrará este intento." size="sm" footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={onCancel}>Seguir revisando</Button><Button onClick={onConfirm}>Entregar examen</Button></div>}><div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">{(unansweredCount > 0 || flaggedCount > 0) && <p>Antes de entregar, revisa estos avisos:</p>}{unansweredCount > 0 && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"><span className="material-symbols-outlined text-base">error</span>{unansweredCount} pregunta(s) sin contestar.</div>}{flaggedCount > 0 && <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"><span className="material-symbols-outlined text-base">flag</span>{flaggedCount} pregunta(s) marcada(s) para revisar.</div>}<p className="text-xs text-slate-500">Puedes entregar igualmente; las preguntas sin respuesta se calificarán como incorrectas.</p></div></Dialog>;
}

function CorrectionDetails({ correction, question, studentAnswer, onAskTutorAboutQuestion }: { readonly correction: QuestionCorrection; readonly question: QuizQuestion | TestQuestion; readonly studentAnswer: string; readonly onAskTutorAboutQuestion?: ArtifactWorkspaceProps["onAskTutorAboutQuestion"] }) {
  const isIncorrect = "correct" in correction ? !correction.correct : correction.score < correction.maxScore;
  return <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-950 sm:text-sm">{correction.questionType === "multiple-choice" && question.type === "multiple-choice" && <><p className="text-slate-700 dark:text-slate-300">Respuesta correcta: <strong className="text-emerald-600 dark:text-emerald-400">{optionText(question, correction.correctOptionId)}</strong></p><p className="mt-2 leading-relaxed text-slate-500 dark:text-slate-400">{correction.explanation}</p></>}{correction.questionType === "true-false" && <><p className="text-slate-700 dark:text-slate-300">Respuesta correcta: <strong className="text-emerald-600 dark:text-emerald-400">{correction.correctAnswer ? "Verdadero" : "Falso"}</strong></p><p className="mt-2 leading-relaxed text-slate-500 dark:text-slate-400">{correction.explanation}</p></>}{correction.questionType === "short-answer" && <p className="leading-relaxed text-slate-700 dark:text-slate-300">{correction.feedback}</p>}{isIncorrect && onAskTutorAboutQuestion && <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800/80"><span className="text-[11px] text-slate-500 dark:text-slate-400">¿Dudas con este resultado?</span><button type="button" onClick={() => onAskTutorAboutQuestion({ question: question.prompt, studentAnswer, correctAnswer: correction.questionType === "multiple-choice" && question.type === "multiple-choice" ? optionText(question, correction.correctOptionId) : correction.questionType === "true-false" ? correction.correctAnswer ? "Verdadero" : "Falso" : undefined, explanation: correction.questionType === "short-answer" ? correction.feedback : correction.explanation })} className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-600/20 dark:text-indigo-300"><span className="material-symbols-outlined text-xs">psychology</span>Preguntar al tutor sobre este fallo</button></div>}</div>;
}

function ErrorMessage({ children }: { readonly children: string }) { return <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{children}</div>; }
function questionCorrect(question: QuizQuestion, value: string) { return question.type === "multiple-choice" ? value === question.correctOptionId : value === String(question.correctAnswer); }
function isAnswerProvided(value: string | undefined) { return (value ?? "").trim().length > 0; }
const optionText = (question: MultipleChoiceQuestion, optionId: string) => question.options.find((option) => option.id === optionId)?.text ?? optionId;
const formatTimer = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds % 60)).padStart(2, "0")}`;
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)} min ${seconds % 60} s`;

type BuiltAnswer =
  | { readonly questionType: "multiple-choice"; readonly questionId: string; readonly selectedOptionId: string }
  | { readonly questionType: "true-false"; readonly questionId: string; readonly answer: boolean }
  | { readonly questionType: "short-answer"; readonly questionId: string; readonly answer: string };

function buildSubmitInput(artifact: Extract<Artifact, { readonly kind: "quiz" | "test" }>, answers: Answers): SubmitAttemptInput {
  const builtAnswers = artifact.questions.flatMap<BuiltAnswer>((question) => {
    const value = answers[question.id] ?? "";
    if (!isAnswerProvided(value)) return [];
    switch (question.type) {
      case "multiple-choice": return [{ questionType: "multiple-choice" as const, questionId: question.id, selectedOptionId: value }];
      case "true-false": return [{ questionType: "true-false" as const, questionId: question.id, answer: value === "true" }];
      case "short-answer": return [{ questionType: "short-answer" as const, questionId: question.id, answer: value }];
    }
  });
  return artifact.kind === "quiz" ? { artifactKind: "quiz", artifactId: artifact.id, answers: builtAnswers.filter((answer) => answer.questionType !== "short-answer") } : { artifactKind: "test", artifactId: artifact.id, answers: builtAnswers };
}
