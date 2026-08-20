import { useAtomValue } from "@effect/atom-react";
import type { Artifact, NoteArtifact, QuizArtifact, TestArtifact } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useState } from "react";
import { artifactQuery } from "../domain/artifacts/atoms.ts";

interface ArtifactChatCardProps {
  readonly artifactId: string;
  readonly onOpenInWorkspace: (artifactId: string) => void;
  readonly onOpenMindMap?: (() => void) | undefined;
  readonly isLight?: boolean;
}

export function ArtifactChatCard({
  artifactId,
  onOpenInWorkspace,
  onOpenMindMap,
  isLight = false
}: ArtifactChatCardProps) {
  const query = artifactQuery(artifactId);
  const result = useAtomValue(query);

  const [isSaved, setIsSaved] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`proxus_saved_artifact_${artifactId}`);
      return saved === "true";
    } catch {
      return false;
    }
  });

  const toggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`proxus_saved_artifact_${artifactId}`, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className="my-3 w-full">
      {AsyncResult.matchWithError(result, {
        onInitial: () => (
          <div className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-xs ${
            isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-slate-900/60 border-slate-800 text-slate-400"
          }`}>
            <div className="size-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
            <span>Cargando recurso de estudio…</span>
          </div>
        ),
        onError: () => null,
        onDefect: () => null,
        onSuccess: ({ value: artifact }) => (
          <ArtifactCardView
            artifact={artifact}
            isSaved={isSaved}
            onToggleSave={toggleSave}
            onOpenInWorkspace={onOpenInWorkspace}
            onOpenMindMap={onOpenMindMap}
            isLight={isLight}
          />
        )
      })}
    </div>
  );
}

function ArtifactCardView({
  artifact,
  isSaved,
  onToggleSave,
  onOpenInWorkspace,
  onOpenMindMap,
  isLight
}: {
  readonly artifact: Artifact;
  readonly isSaved: boolean;
  readonly onToggleSave: (e: React.MouseEvent) => void;
  readonly onOpenInWorkspace: (id: string) => void;
  readonly onOpenMindMap?: (() => void) | undefined;
  readonly isLight: boolean;
}) {
  const getTheme = () => {
    switch (artifact.kind) {
      case "note":
        return {
          icon: "description",
          badge: "Nota de estudio",
          badgeColor: isLight ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
          border: isLight ? "border-indigo-200 bg-white" : "border-indigo-500/30 bg-slate-900/90",
          accentText: "text-indigo-500"
        };
      case "quiz":
        return {
          icon: "quiz",
          badge: `Quiz interactivo · ${artifact.questions.length} preguntas`,
          badgeColor: isLight ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-purple-500/15 text-purple-300 border-purple-500/30",
          border: isLight ? "border-purple-200 bg-white" : "border-purple-500/30 bg-slate-900/90",
          accentText: "text-purple-500"
        };
      case "test":
        return {
          icon: "timer",
          badge: `Simulacro · ${artifact.questions.length} preguntas`,
          badgeColor: isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
          border: isLight ? "border-emerald-200 bg-white" : "border-emerald-500/30 bg-slate-900/90",
          accentText: "text-emerald-500"
        };
    }
  };

  const theme = getTheme();

  return (
    <div className={`overflow-hidden rounded-2xl border backdrop-blur-md transition-all shadow-md ${theme.border}`}>
      {/* Header Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b ${
        isLight ? "border-slate-100 bg-slate-50/80" : "border-slate-800/80 bg-slate-950/60"
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`grid size-7 place-items-center rounded-lg border text-sm ${theme.badgeColor}`}>
            <span className="material-symbols-outlined text-[16px]">{theme.icon}</span>
          </span>
          <span className={`text-[11px] font-semibold uppercase tracking-wider rounded-md px-2 py-0.5 border ${theme.badgeColor}`}>
            {theme.badge}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Bookmark / Pin to Library Button */}
          <button
            type="button"
            onClick={onToggleSave}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${
              isSaved
                ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300 shadow-xs"
                : isLight
                ? "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-slate-700"
            }`}
            title={isSaved ? "Guardado en tu biblioteca" : "Guardar en tu biblioteca"}
          >
            <span className="material-symbols-outlined text-[14px]">
              {isSaved ? "star" : "star_outline"}
            </span>
            <span>{isSaved ? "Guardado" : "Guardar en biblioteca"}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenInWorkspace(artifact.id)}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500"
            title="Abrir en el espacio de estudio principal"
          >
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            <span className="hidden sm:inline">Abrir</span>
          </button>
        </div>
      </div>

      {/* Card Content & Interactive Experience */}
      <div className="p-4 sm:p-5">
        <h3 className={`font-display text-base sm:text-lg font-bold mb-3 ${
          isLight ? "text-slate-900" : "text-slate-100"
        }`}>
          {artifact.title}
        </h3>

        {artifact.kind === "quiz" ? (
          <InlineQuizSolver quiz={artifact} isLight={isLight} onOpenFull={() => onOpenInWorkspace(artifact.id)} />
        ) : artifact.kind === "note" ? (
          <InlineNotePreview note={artifact} isLight={isLight} onOpenMindMap={onOpenMindMap} onOpenFull={() => onOpenInWorkspace(artifact.id)} />
        ) : (
          <InlineTestPreview test={artifact} isLight={isLight} onOpenFull={() => onOpenInWorkspace(artifact.id)} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Interactive Quiz Solver inside Chat
// ---------------------------------------------------------------------------

function InlineQuizSolver({
  quiz,
  isLight,
  onOpenFull
}: {
  readonly quiz: QuizArtifact;
  readonly isLight: boolean;
  readonly onOpenFull: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | boolean>>({});
  const [showExplanation, setShowExplanation] = useState(false);

  const question = quiz.questions[currentIdx];
  if (!question) return null;

  const currentAnswer = selectedAnswers[question.id];
  const isAnswered = currentAnswer !== undefined;

  const isCorrect =
    question.type === "multiple-choice"
      ? currentAnswer === question.correctOptionId
      : currentAnswer === question.correctAnswer;

  const handleSelectOption = (optId: string | boolean) => {
    if (isAnswered) return;
    setSelectedAnswers((prev) => ({ ...prev, [question.id]: optId }));
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Question Header & Counter */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Pregunta {currentIdx + 1} de {quiz.questions.length}</span>
        <div className="flex items-center gap-1">
          {quiz.questions.map((q, idx) => {
            const ans = selectedAnswers[q.id];
            const correct =
              q.type === "multiple-choice" ? ans === q.correctOptionId : ans === q.correctAnswer;
            return (
              <span
                key={q.id}
                className={`size-2 rounded-full transition-colors ${
                  idx === currentIdx
                    ? "bg-purple-500 ring-2 ring-purple-500/30"
                    : ans !== undefined
                    ? correct
                      ? "bg-emerald-500"
                      : "bg-red-500"
                    : isLight
                    ? "bg-slate-200"
                    : "bg-slate-800"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Question Prompt */}
      <p className={`text-sm font-medium leading-relaxed ${isLight ? "text-slate-800" : "text-slate-200"}`}>
        {question.prompt}
      </p>

      {/* Answer Options */}
      <div className="grid gap-2 mt-1">
        {question.type === "multiple-choice" ? (
          question.options.map((option, oIdx) => {
            const letter = String.fromCharCode(65 + oIdx);
            const isThisSelected = currentAnswer === option.id;
            const isThisCorrect = option.id === question.correctOptionId;

            let optionStyle = isLight
              ? "border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/40 text-slate-800"
              : "border-slate-800 bg-slate-900/60 hover:border-purple-500/40 hover:bg-slate-800/80 text-slate-200";

            if (isAnswered) {
              if (isThisCorrect) {
                optionStyle = isLight
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-emerald-400"
                  : "border-emerald-600/80 bg-emerald-950/40 text-emerald-200 font-semibold ring-1 ring-emerald-500";
              } else if (isThisSelected && !isThisCorrect) {
                optionStyle = isLight
                  ? "border-red-300 bg-red-50 text-red-900 ring-1 ring-red-400"
                  : "border-red-600/80 bg-red-950/40 text-red-200 ring-1 ring-red-500";
              } else {
                optionStyle = "opacity-50 border-transparent";
              }
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectOption(option.id)}
                disabled={isAnswered}
                className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-xs transition cursor-pointer disabled:cursor-default ${optionStyle}`}
              >
                <span className={`grid size-6 shrink-0 place-items-center rounded-lg font-mono font-bold text-[11px] ${
                  isAnswered && isThisCorrect
                    ? "bg-emerald-500 text-white"
                    : isAnswered && isThisSelected
                    ? "bg-red-500 text-white"
                    : isLight
                    ? "bg-slate-100 text-slate-600"
                    : "bg-slate-800 text-slate-300"
                }`}>
                  {letter}
                </span>
                <span className="flex-1 leading-snug">{option.text}</span>
              </button>
            );
          })
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {[true, false].map((val) => {
              const label = val ? "Verdadero" : "Falso";
              const isThisSelected = currentAnswer === val;
              const isThisCorrect = val === question.correctAnswer;

              let btnStyle = isLight
                ? "border-slate-200 bg-white hover:bg-purple-50 text-slate-800"
                : "border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200";

              if (isAnswered) {
                if (isThisCorrect) {
                  btnStyle = "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-semibold";
                } else if (isThisSelected) {
                  btnStyle = "border-red-500 bg-red-500/20 text-red-300 font-semibold";
                } else {
                  btnStyle = "opacity-40 border-transparent";
                }
              }

              return (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => handleSelectOption(val)}
                  disabled={isAnswered}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-semibold transition ${btnStyle}`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {val ? "check_circle" : "cancel"}
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Explanation Box */}
      {showExplanation && (
        <div className={`mt-2 rounded-xl border p-3 text-xs animate-in fade-in ${
          isCorrect
            ? isLight
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-emerald-800/40 bg-emerald-950/30 text-emerald-200"
            : isLight
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-red-800/40 bg-red-950/30 text-red-200"
        }`}>
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <span className="material-symbols-outlined text-[16px]">
              {isCorrect ? "check_circle" : "error"}
            </span>
            <span>{isCorrect ? "¡Correcto!" : "Respuesta incorrecta"}</span>
          </div>
          <p className="leading-relaxed">{question.explanation}</p>
        </div>
      )}

      {/* Navigation Footer */}
      {isAnswered && (
        <div className="flex items-center justify-between pt-2">
          {currentIdx < quiz.questions.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="ml-auto flex items-center gap-1 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-500 transition"
            >
              <span>Siguiente pregunta</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </button>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                🎉 ¡Quiz completado!
              </span>
              <button
                type="button"
                onClick={onOpenFull}
                className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition"
              >
                <span>Ver resumen en Workspace</span>
                <span className="material-symbols-outlined text-[15px]">launch</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Note Preview inside Chat
// ---------------------------------------------------------------------------

function InlineNotePreview({
  note,
  isLight,
  onOpenMindMap,
  onOpenFull
}: {
  readonly note: NoteArtifact;
  readonly isLight: boolean;
  readonly onOpenMindMap?: (() => void) | undefined;
  readonly onOpenFull: () => void;
}) {
  const snippet = note.markdown
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .slice(0, 3)
    .join(" ")
    .replace(/[*_#]/g, "");

  return (
    <div className="flex flex-col gap-3">
      <p className={`text-xs leading-relaxed line-clamp-3 ${isLight ? "text-slate-600" : "text-slate-300"}`}>
        {snippet || "Nota conceptual estructurada con conceptos clave y casos prácticos."}
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {onOpenMindMap && (
          <button
            type="button"
            onClick={onOpenMindMap}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              isLight
                ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                : "border-indigo-800/50 bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">schema</span>
            <span>Ver en Mapa Mental</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenFull}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
            isLight
              ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
              : "border-slate-700/60 bg-slate-800/80 text-slate-200 hover:bg-slate-800"
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">menu_book</span>
          <span>Leer nota completa</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Test Preview inside Chat
// ---------------------------------------------------------------------------

function InlineTestPreview({
  test,
  isLight,
  onOpenFull
}: {
  readonly test: TestArtifact;
  readonly isLight: boolean;
  readonly onOpenFull: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px] text-emerald-500">list_alt</span>
          <span>{test.questions.length} preguntas de examen</span>
        </span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px] text-amber-500">schedule</span>
          <span>Cronometrado</span>
        </span>
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={onOpenFull}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition"
        >
          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
          <span>Iniciar simulacro de examen</span>
        </button>
      </div>
    </div>
  );
}
