import type { Dispatch, RefObject, SetStateAction } from "react";
import proxoAvatar from "../../assets/proxo-avatar.jpg";
import proxoSocraticAvatar from "../../assets/proxo-socratic-avatar.jpg";
import type { TutorMode } from "./types.ts";

export function ChatModeSwitcher({
  isLight,
  tutorMode,
  setTutorMode,
  magIaRef,
  isMagIaOpen,
  setIsMagIaOpen,
  onOpen
}: {
  readonly isLight: boolean;
  readonly tutorMode: TutorMode;
  readonly setTutorMode: (mode: TutorMode) => void;
  readonly magIaRef: RefObject<HTMLDivElement | null>;
  readonly isMagIaOpen: boolean;
  readonly setIsMagIaOpen: Dispatch<SetStateAction<boolean>>;
  readonly onOpen: () => void;
}) {
  return (
    <div className="relative" ref={magIaRef}>
      <button
        type="button"
        onClick={() => {
          setIsMagIaOpen(!isMagIaOpen);
          onOpen();
        }}
        className={`group flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold border transition-all duration-150 active:scale-95 ${
          tutorMode === "socratic"
            ? isLight
              ? "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 shadow-2xs"
              : "bg-purple-950/40 hover:bg-purple-900/50 border-purple-800/60 text-purple-300 shadow-2xs"
            : isLight
            ? "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700 shadow-2xs"
            : "bg-indigo-950/40 hover:bg-indigo-900/50 border-indigo-800/60 text-indigo-300 shadow-2xs"
        }`}
        title={`Modo de tutoría actual: ${tutorMode === "socratic" ? "Socrático" : "Explicativo"} (clic para cambiar)`}
        aria-expanded={isMagIaOpen}
        aria-haspopup="true"
      >
        <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
          {tutorMode === "socratic" ? "school" : "menu_book"}
        </span>
        <span>{tutorMode === "socratic" ? "Socrático" : "Explicativo"}</span>
        <span
          className={`material-symbols-outlined text-xs opacity-70 transition-transform duration-200 ${
            isMagIaOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {isMagIaOpen && (
        <div
          className={`absolute bottom-full left-0 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border p-2 shadow-xl z-30 ui-popover-enter backdrop-blur-xl ${
            isLight
              ? "bg-white/95 border-slate-200 text-slate-800 shadow-slate-900/10"
              : "bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/50"
          }`}
        >
          <div className="px-2 pt-1 pb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">tune</span>
              <span>Modo de Tutoría</span>
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                setTutorMode("explanatory");
                setIsMagIaOpen(false);
              }}
              className={`flex items-start gap-2.5 rounded-xl p-2 text-xs text-left transition-all duration-150 border ${
                tutorMode === "explanatory"
                  ? isLight
                    ? "bg-indigo-50/90 border-indigo-300 shadow-xs ring-1 ring-indigo-400/30"
                    : "bg-indigo-950/60 border-indigo-500/60 shadow-xs ring-1 ring-indigo-500/30"
                  : isLight
                  ? "border-transparent hover:bg-slate-100/80 text-slate-700"
                  : "border-transparent hover:bg-slate-800/60 text-slate-300"
              }`}
            >
              <img
                src={proxoAvatar}
                alt="Modo Explicativo"
                className="size-8 rounded-lg object-cover border border-indigo-500/30 shrink-0 shadow-2xs mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Modo Explicativo</p>
                  {tutorMode === "explanatory" && (
                    <span className="material-symbols-outlined text-[15px] text-indigo-500 font-bold ui-scale-in">
                      check_circle
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Respuestas directas, definiciones y ejemplos paso a paso.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setTutorMode("socratic");
                setIsMagIaOpen(false);
              }}
              className={`flex items-start gap-2.5 rounded-xl p-2 text-xs text-left transition-all duration-150 border ${
                tutorMode === "socratic"
                  ? isLight
                    ? "bg-purple-50/90 border-purple-300 shadow-xs ring-1 ring-purple-400/30"
                    : "bg-purple-950/60 border-purple-500/60 shadow-xs ring-1 ring-purple-500/30"
                  : isLight
                  ? "border-transparent hover:bg-slate-100/80 text-slate-700"
                  : "border-transparent hover:bg-slate-800/60 text-slate-300"
              }`}
            >
              <img
                src={proxoSocraticAvatar}
                alt="Modo Socrático"
                className="size-8 rounded-lg object-cover border border-purple-500/30 shrink-0 shadow-2xs mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Modo Socrático</p>
                  {tutorMode === "socratic" && (
                    <span className="material-symbols-outlined text-[15px] text-purple-500 font-bold ui-scale-in">
                      check_circle
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Preguntas reflexivas y pistas para deducir la solución.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
