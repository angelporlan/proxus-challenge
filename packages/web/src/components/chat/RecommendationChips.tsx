import type { TutorRecommendation } from "@proxus/shared";
import { useState } from "react";

export function RecommendationChips({
  recommendations,
  isLight,
  onSubmit
}: {
  readonly recommendations: readonly TutorRecommendation[];
  readonly isLight: boolean;
  readonly onSubmit: (prompt: string, displayInput?: string) => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div
      className={`mt-4 border-t pt-3 ${
        isLight ? "border-slate-100" : "border-slate-800/80"
      }`}
    >
      <p className={`mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider ${isLight ? "text-slate-400" : "text-slate-500"}`}>
        Siguiente paso
      </p>
      <div className="flex flex-wrap gap-2">
        {recommendations.map((recommendation) => {
          const isQuiz = recommendation.kind === "quiz";
          const key = `${recommendation.kind}-${recommendation.prompt}`;
          return (
            <button
              key={key}
              type="button"
              aria-label={recommendation.label}
              disabled={selectedKey !== null}
              onClick={() => {
                setSelectedKey(key);
                onSubmit(recommendation.prompt, recommendation.label);
              }}
              className={`flex min-h-9 max-w-full items-center gap-1.5 rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 ${
                isQuiz
                  ? isLight
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100"
                    : "border-indigo-500/40 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20"
                  : isLight
                    ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "border-slate-700/60 bg-slate-800/80 text-slate-200 hover:bg-slate-800"
              }`}
            >
              <span className="material-symbols-outlined shrink-0 text-sm" aria-hidden="true">
                {isQuiz ? "quiz" : "help_outline"}
              </span>
              <span className="min-w-0 truncate">{recommendation.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
