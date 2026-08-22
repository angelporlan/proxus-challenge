import { GAP_RESCUE_QUESTION_COUNTS, type GapRescueQuestionCount } from "./gap-rescue.ts";

export function GapRescueCountPicker({
  isLight,
  onSelect,
  onBack
}: {
  readonly isLight: boolean;
  readonly onSelect: (count: GapRescueQuestionCount) => void;
  readonly onBack: () => void;
}) {
  return (
    <div className="text-left">
      <button
        type="button"
        onClick={onBack}
        className={`mb-4 inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium transition ${isLight
            ? "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          }`}
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_back</span>
        Volver
      </button>

      <div
        className={`rounded-2xl rounded-bl-sm border p-4 sm:p-5 ${isLight
            ? "border-slate-200 bg-white text-slate-800 shadow-sm"
            : "border-slate-800 bg-slate-900/90 text-slate-100 shadow-lg shadow-black/10"
          }`}
        role="group"
        aria-labelledby="gap-rescue-count-title"
      >
        <p id="gap-rescue-count-title" className="text-sm font-semibold">
          ¿Cuántas preguntas quieres que tenga el ejercicio?
        </p>
        <p className={`mt-1 text-[11px] leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
          Elige 3, 6 o 10 preguntas.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {GAP_RESCUE_QUESTION_COUNTS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border px-3 py-2.5 transition active:scale-[0.98] ${isLight
                  ? "border-slate-200 bg-slate-50 text-slate-800 hover:border-indigo-400 hover:bg-indigo-50"
                  : "border-slate-700 bg-slate-800/70 text-slate-100 hover:border-indigo-500/60 hover:bg-indigo-500/10"
                }`}
            >
              <span className="text-base font-bold leading-none">{option.label}</span>
              <span className={`text-[10px] font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                {option.hint}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
