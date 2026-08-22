import { useMemo, useState } from "react";
import type { AgentMessage } from "@proxus/shared";
import { ProxoFrameAnimation } from "../ProxoFrameAnimation.tsx";
import type { TutorMode } from "./types.ts";

export function TutorThinkingBubble({
  isLight,
  mode = "explanatory"
}: {
  readonly isLight: boolean;
  readonly mode?: TutorMode | undefined;
}) {
  return (
    <div className="ui-enter flex w-full max-w-3xl items-start gap-2.5" aria-label="Proxo está pensando" role="status">
      <ProxoFrameAnimation
        mode={mode}
        state="thinking"
        size="sm"
        isLight={isLight}
        className="mt-1 shrink-0"
      />
      <div
        className={`rounded-2xl rounded-bl-sm border px-4 py-3 text-xs ${
          isLight
            ? "border-slate-200 bg-white text-slate-600 shadow-sm"
            : "border-slate-800 bg-slate-900/90 text-slate-300 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">Proxo</span>
          <span className="text-slate-500 dark:text-slate-400">
            {mode === "socratic" ? "está formulando una pregunta" : "está pensando"}
          </span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="ui-thinking-dot" />
            <span className="ui-thinking-dot ui-thinking-dot--2" />
            <span className="ui-thinking-dot ui-thinking-dot--3" />
          </span>
        </div>
      </div>
    </div>
  );
}

/** Groups tool activity into a concise, user-facing progress summary. */
export function ReasoningFlowBox({
  items,
  isThinking,
  isLight
}: {
  readonly items: readonly AgentMessage[];
  readonly isThinking?: boolean | undefined;
  readonly isLight?: boolean | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const steps = useMemo(() => {
    const result: Array<{
      id: string;
      icon: string;
      title: string;
      subtitle?: string | undefined;
      isDone: boolean;
      isFailure?: boolean | undefined;
    }> = [];

    for (const msg of items) {
      if (msg.role === "tool-call") {
        const friendly = getFriendlyToolCallLabel(msg);
        result.push({
          id: `${msg.name}-${result.length}`,
          icon: friendly.icon,
          title: friendly.title,
          subtitle: friendly.subtitle,
          isDone: false
        });
      } else if (msg.role === "tool-result") {
        const lastStep = result.at(-1);
        if (lastStep) {
          lastStep.isDone = true;
          lastStep.isFailure = msg.isFailure;
        }
      }
    }

    return result;
  }, [items]);

  const activeStep = steps.find((s) => !s.isDone) ?? steps.at(-1);

  return (
    <div className="ui-enter w-full max-w-3xl my-1">
      <div
        className={`rounded-xl border p-3 text-xs shadow-sm backdrop-blur transition ${
          isLight
            ? "border-indigo-200 bg-white/90 text-slate-700 shadow-slate-100"
            : "border-indigo-950/80 bg-slate-950/60 text-slate-300"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="group flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`grid size-6 place-items-center rounded-lg ${
                isLight
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-indigo-600/20 text-indigo-400"
              }`}
            >
              <span
                className={`material-symbols-outlined text-sm ${isThinking ? "ui-progress-spin" : ""}`}
                aria-hidden="true"
              >
                {isThinking ? "progress_activity" : "check_circle"}
              </span>
            </span>
            <div>
              <span
                className={`font-semibold ${
                  isLight ? "text-slate-800" : "text-slate-200"
                }`}
              >
                {isThinking
                  ? activeStep?.title ?? "Consultando tus materiales…"
                  : `Actividad del tutor · ${steps.length} ${steps.length === 1 ? "paso" : "pasos"}`}
              </span>
              {activeStep?.subtitle && (
                <p
                  className={`text-[11px] line-clamp-1 ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {activeStep.subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] transition ${
                isLight
                  ? "text-slate-500 group-hover:text-indigo-600"
                  : "text-slate-400 group-hover:text-indigo-300"
              }`}
            >
              {isOpen ? "Ocultar detalles" : "Ver pasos"}
            </span>
            <span
              className={`material-symbols-outlined text-xs transition-transform ${
                isLight ? "text-slate-400" : "text-slate-400"
              } ${isOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              expand_more
            </span>
          </div>
        </button>

        {isOpen && (
          <ol
            className={`mt-3 pt-3 border-t space-y-2 ${
              isLight ? "border-slate-200" : "border-slate-800/70"
            }`}
          >
            {steps.map((step) => (
              <li
                key={step.id}
                className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs ${
                  isLight
                    ? "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-slate-900/50 border-slate-800/50 text-slate-300"
                }`}
              >
                <span className="material-symbols-outlined text-sm text-indigo-500 mt-0.5" aria-hidden="true">
                  {step.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold ${
                        isLight ? "text-slate-900" : "text-slate-200"
                      }`}
                    >
                      {step.title}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        step.isDone
                          ? step.isFailure
                            ? isLight
                              ? "bg-red-100 text-red-700"
                              : "bg-red-950 text-red-300"
                            : isLight
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-emerald-950 text-emerald-300"
                          : isLight
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-indigo-950 text-indigo-300"
                      }`}
                      aria-live="polite"
                    >
                      {step.isDone
                        ? step.isFailure
                          ? "Aviso"
                          : "Completado"
                        : "En curso..."}
                    </span>
                  </div>
                  {step.subtitle && (
                    <p
                      className={`text-[11px] mt-0.5 ${
                        isLight ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      {step.subtitle}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/**
 * Converts raw internal tool calls into human-friendly academic study phrasing
 */
export function getFriendlyToolCallLabel(message: AgentMessage): {
  icon: string;
  title: string;
  subtitle?: string;
} {
  if (message.role === "tool-call") {
    if (message.name === "load_skill") {
      const skillName =
        typeof message.input === "object" && message.input && "name" in message.input
          ? String((message.input as { name: unknown }).name)
          : "";
      if (skillName.includes("material")) {
        return {
          icon: "menu_book",
          title: "Preparando tus materiales",
          subtitle: "Organizando los documentos que necesita la respuesta"
        };
      }
      if (skillName.includes("artifact")) {
        return {
          icon: "edit_note",
          title: "Preparando un recurso de estudio",
          subtitle: "Organizando el contenido solicitado"
        };
      }
      return {
        icon: "psychology",
        title: "Preparando el enfoque de estudio"
      };
    }

    if (message.name === "cli") {
      const input =
        typeof message.input === "object" && message.input && "input" in message.input
          ? String((message.input as { input: unknown }).input)
          : "";

      if (input.startsWith("materials view")) {
        const parts = input.split(" ");
        const pages = parts[3];
        return {
          icon: "visibility",
          title: pages ? `Revisando las páginas ${pages}` : "Leyendo el documento seleccionado",
          subtitle: "Buscando la información relevante"
        };
      }

      if (input.startsWith("materials list")) {
        return {
          icon: "folder_open",
          title: "Consultando índice de materiales subidos",
          subtitle: "Comprobando documentos disponibles en la sesión"
        };
      }

      if (input.startsWith("artifacts create")) {
        return {
          icon: "draw",
          title: "Generando recurso interactivo de estudio",
          subtitle: "Construyendo preguntas, respuestas y explicaciones"
        };
      }

      if (input.startsWith("artifacts grade")) {
        return {
          icon: "fact_check",
          title: "Evaluando y corrigiendo respuestas del examen",
          subtitle: "Calculando puntuación y retroalimentación pedagógica"
        };
      }

      return {
        icon: "memory",
        title: "Preparando información de estudio"
      };
    }
  }

  return {
    icon: "progress_activity",
    title: "Preparando la respuesta"
  };
}
