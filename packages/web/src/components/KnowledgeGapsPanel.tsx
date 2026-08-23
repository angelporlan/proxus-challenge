import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { MASTERY_STREAK, type KnowledgeGap, type KnowledgeGapStatus } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useState } from "react";
import {
  clearKnowledgeProfileAction,
  knowledgeProfileQuery,
  updateGapStatusAction
} from "../domain/knowledge/atoms.ts";

interface KnowledgeGapsPanelProps {
  readonly onAskTutorAboutGap?: ((gap: KnowledgeGap) => void) | undefined;
  readonly theme?: "dark" | "light" | undefined;
}

type FilterTab = "all" | "active" | "reviewing" | "mastered";

export function KnowledgeGapsPanel({
  onAskTutorAboutGap,
  theme = "dark"
}: KnowledgeGapsPanelProps) {
  const isLight = theme === "light";
  const [filter, setFilter] = useState<FilterTab>("active");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const profileResult = useAtomValue(knowledgeProfileQuery);
  const refreshProfile = useAtomRefresh(knowledgeProfileQuery);
  const updateStatus = useAtomSet(updateGapStatusAction, { mode: "promise" });
  const clearProfile = useAtomSet(clearKnowledgeProfileAction, { mode: "promise" });

  const profile = AsyncResult.match(profileResult, {
    onInitial: () => ({ gaps: [], totalAttempts: 0 }),
    onFailure: () => ({ gaps: [], totalAttempts: 0 }),
    onSuccess: ({ value }) => value
  });

  const activeGaps = profile.gaps.filter((g) => g.status === "active");
  const reviewingGaps = profile.gaps.filter((g) => g.status === "reviewing");
  const masteredGaps = profile.gaps.filter((g) => g.status === "mastered");

  const filteredGaps = profile.gaps.filter((gap) => {
    if (filter === "all") return true;
    return gap.status === filter;
  });

  const handleStatusChange = async (id: string, newStatus: KnowledgeGapStatus) => {
    setIsUpdating(id);
    try {
      await updateStatus({ id, status: newStatus });
      refreshProfile();
    } finally {
      setIsUpdating(null);
    }
  };

  const handleClear = async () => {
    if (window.confirm("¿Seguro que deseas reiniciar tu historial de lagunas y progreso de estudio?")) {
      await clearProfile();
      refreshProfile();
    }
  };

  const totalGaps = profile.gaps.length;
  const hasEvaluations = profile.totalAttempts > 0;
  const masteryPercentage = totalGaps === 0 ? (hasEvaluations ? 100 : 0) : Math.round((masteredGaps.length / totalGaps) * 100);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className={`p-5 border-b ${isLight ? "border-slate-200 bg-white" : "border-slate-800/80 bg-slate-900/60"}`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <span className="material-symbols-outlined text-base">psychology_alt</span>
            </span>
            <div>
              <h2 className={`font-display font-bold text-base ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                Dominio y Lagunas de Conocimiento
              </h2>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Detectadas automáticamente al resolver quizzes y exámenes
              </p>
            </div>
          </div>

          {profile.gaps.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                isLight
                  ? "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                  : "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-red-400"
              }`}
              title="Reiniciar historial"
            >
              Reiniciar
            </button>
          )}
        </div>

        {/* High-level metrics */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className={`p-2.5 rounded-xl border text-center ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/40"}`}>
            <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Quizzes</span>
            <span className={`font-display font-bold text-lg ${isLight ? "text-slate-800" : "text-slate-100"}`}>{profile.totalAttempts}</span>
          </div>

          <div className={`p-2.5 rounded-xl border text-center ${isLight ? "border-red-200 bg-red-50/50" : "border-red-900/30 bg-red-950/20"}`}>
            <span className="block text-[11px] font-medium text-red-500 uppercase tracking-wider">Activas</span>
            <span className="font-display font-bold text-lg text-red-500">{activeGaps.length}</span>
          </div>

          <div className={`p-2.5 rounded-xl border text-center ${isLight ? "border-amber-200 bg-amber-50/50" : "border-amber-900/30 bg-amber-950/20"}`}>
            <span className="block text-[11px] font-medium text-amber-500 uppercase tracking-wider">En Repaso</span>
            <span className="font-display font-bold text-lg text-amber-500">{reviewingGaps.length}</span>
          </div>

          <div className={`p-2.5 rounded-xl border text-center ${isLight ? "border-emerald-200 bg-emerald-50/50" : "border-emerald-900/30 bg-emerald-950/20"}`}>
            <span className="block text-[11px] font-medium text-emerald-500 uppercase tracking-wider">Dominadas</span>
            <span className="font-display font-bold text-lg text-emerald-500">{masteredGaps.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        {totalGaps > 0 && (
          <div className="mt-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className={`font-medium ${isLight ? "text-slate-600" : "text-slate-300"}`}>Tasa de Dominio Global</span>
              <span className="font-bold text-indigo-500">{masteryPercentage}%</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isLight ? "bg-slate-200" : "bg-slate-800"}`}>
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${masteryPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className={`flex items-center gap-1 px-5 py-2.5 border-b overflow-x-auto ${isLight ? "border-slate-200 bg-slate-50/70" : "border-slate-800/80 bg-slate-900/40"}`}>
        {(
          [
            { key: "active", label: "Activas", count: activeGaps.length },
            { key: "reviewing", label: "En Repaso", count: reviewingGaps.length },
            { key: "mastered", label: "Dominadas", count: masteredGaps.length },
            { key: "all", label: "Todas", count: totalGaps }
          ] as const
        ).map((tab) => {
          const isSelected = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isLight
                    ? "text-slate-600 hover:bg-slate-200/70"
                    : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                isSelected ? "bg-indigo-700/80 text-white" : isLight ? "bg-slate-200 text-slate-600" : "bg-slate-800 text-slate-300"
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Gaps List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
        {filteredGaps.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </div>
            <h3 className={`font-display font-semibold text-base mb-1 ${isLight ? "text-slate-800" : "text-slate-200"}`}>
              {profile.totalAttempts === 0
                ? "¡Aún no hay evaluaciones realizadas!"
                : filter === "active"
                ? "¡Sin lagunas activas pendientes!"
                : "No hay conceptos en esta sección"}
            </h3>
            <p className={`text-xs max-w-xs mx-auto leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              {profile.totalAttempts === 0
                ? "Resuelve quizzes o exámenes desde tus materiales para poner a prueba tus conocimientos y detectar lagunas."
                : filter === "active"
                ? "Resuelve más quizzes y exámenes desde tus materiales para poner a prueba tu retención."
                : "Cambia de filtro para revisar otros estados de aprendizaje."}
            </p>
          </div>
        ) : (
          filteredGaps.map((gap) => (
            <div
              key={gap.id}
              className={`rounded-xl border p-4 transition shadow-sm ${
                isLight ? "bg-white border-slate-200 hover:border-slate-300" : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                    gap.status === "active"
                      ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/40"
                      : gap.status === "reviewing"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40"
                  }`}>
                    {gap.status === "active" ? "Laguna Activa" : gap.status === "reviewing" ? "En Repaso" : "Dominada"}
                  </span>
                  {gap.status === "mastered" && gap.masteryEvidence !== undefined && (
                    <span className={`ml-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${gap.masteryEvidence === "graded-attempt" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {gap.masteryEvidence === "graded-attempt" ? "Verificada por quiz" : "Marcada manualmente"}
                    </span>
                  )}
                  <p className={`text-xs font-mono font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    {gap.topic}
                  </p>
                </div>

                {onAskTutorAboutGap && (
                  <button
                    type="button"
                    onClick={() => onAskTutorAboutGap(gap)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shrink-0 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-xs">chat</span>
                    <span>Repasar con Tutor</span>
                  </button>
                )}
              </div>

              <h4 className={`font-display font-semibold text-sm mb-3 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                {gap.question}
              </h4>

              {/* Answers contrast */}
              <div className={`p-3 rounded-lg text-xs space-y-1.5 mb-3 ${isLight ? "bg-slate-50 border border-slate-200/80" : "bg-slate-950/50 border border-slate-800/80"}`}>
                <div className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
                  <span className="material-symbols-outlined text-sm shrink-0">close</span>
                  <span><strong>Tu respuesta:</strong> {gap.studentAnswer}</span>
                </div>
                <div className="flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="material-symbols-outlined text-sm shrink-0">check</span>
                  <span><strong>Respuesta correcta:</strong> {gap.correctAnswer}</span>
                </div>
              </div>

              {gap.explanation && (
                <p className={`text-xs leading-relaxed mb-3 ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                  💡 <em>{gap.explanation}</em>
                </p>
              )}

              <div className={`mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                <span>Fallada {gap.failCount ?? 1} {(gap.failCount ?? 1) === 1 ? "vez" : "veces"}</span>
                <span>Progreso {Math.min(gap.correctStreak ?? 0, MASTERY_STREAK)}/{MASTERY_STREAK} aciertos</span>
              </div>

              {/* Status transition actions */}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                <span className={`text-[11px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                  Registrado: {new Date(gap.failedAt).toLocaleDateString("es-ES")}
                </span>

                <div className="flex items-center gap-1.5">
                  {gap.status !== "active" && (
                    <button
                      type="button"
                      disabled={isUpdating === gap.id}
                      onClick={() => handleStatusChange(gap.id, "active")}
                      className="px-2 py-0.5 rounded text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Marcar activa
                    </button>
                  )}
                  {gap.status !== "reviewing" && (
                    <button
                      type="button"
                      disabled={isUpdating === gap.id}
                      onClick={() => handleStatusChange(gap.id, "reviewing")}
                      className="px-2 py-0.5 rounded text-[11px] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                    >
                      En repaso
                    </button>
                  )}
                  {gap.status !== "mastered" && (
                    <button
                      type="button"
                      disabled={isUpdating === gap.id}
                      onClick={() => handleStatusChange(gap.id, "mastered")}
                      className="px-2 py-0.5 rounded text-[11px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-medium transition"
                    >
                      ✓ Dominada
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
