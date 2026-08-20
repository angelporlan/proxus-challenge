import { useAtomRefresh } from "@effect/atom-react";
import type { AgentMessage } from "@proxus/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { materialsQuery } from "../domain/materials/atoms.ts";
import { applyInvalidations, invalidationsForToolCall } from "../domain/tutor/invalidation.ts";
import { streamTutorMessage } from "../domain/tutor/stream.ts";

const starterPrompts = [
  {
    icon: "quiz",
    label: "Crear un quiz",
    prompt: "Crea un quiz de 3 preguntas de opción múltiple basado en mis materiales subidos."
  },
  {
    icon: "psychology",
    label: "Repasar un tema",
    prompt: "Explícame el concepto más difícil de mis materiales de forma socrática, haciéndome preguntas para que lo deduzca."
  }
] as const;

type TutorMode = "socratic" | "explanatory";

interface ChatProps {
  readonly prefillPrompt?: string | null | undefined;
  readonly onClearPrefill?: (() => void) | undefined;
  readonly onSelectArtifact?: ((id: string) => void) | undefined;
  readonly onOpenMindMap?: (() => void) | undefined;
  readonly theme?: "dark" | "light" | undefined;
  readonly isMaximized?: boolean | undefined;
  readonly onToggleMaximize?: (() => void) | undefined;
}

type ChatItem =
  | { readonly kind: "user"; readonly message: AgentMessage & { readonly role: "user" } }
  | { readonly kind: "tools"; readonly items: readonly AgentMessage[] }
  | { readonly kind: "assistant"; readonly message: AgentMessage & { readonly role: "assistant" } };

export function Chat({
  prefillPrompt,
  onClearPrefill,
  onSelectArtifact,
  onOpenMindMap,
  theme = "dark",
  isMaximized = false,
  onToggleMaximize
}: ChatProps = {}) {
  const isLight = theme === "light";
  const [messages, setMessages] = useState<readonly AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [tutorMode, setTutorMode] = useState<TutorMode>("explanatory");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const refreshArtifacts = useAtomRefresh(artifactsQuery);
  const refreshMaterials = useAtomRefresh(materialsQuery);
  const pendingInvalidations = useRef<Array<ReturnType<typeof invalidationsForToolCall>>>([]);

  useEffect(() => {
    if (prefillPrompt && !isSending) {
      setInput(prefillPrompt);
      onClearPrefill?.();
    }
  }, [prefillPrompt, isSending, onClearPrefill]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const submit = async (nextInput: string) => {
    const trimmed = nextInput.trim();
    if (trimmed.length === 0 || isSending) {
      return;
    }

    let finalPrompt = trimmed;
    if (tutorMode === "socratic" && !trimmed.toLowerCase().includes("socrátic")) {
      finalPrompt = `[Enfoque pedagógico: Tutor Socrático. Guíame con preguntas paso a paso para que razone por mí mismo sin darme la respuesta de inmediato]\n\n${trimmed}`;
    }

    setIsSending(true);
    setError(undefined);
    pendingInvalidations.current = [];

    try {
      for await (const event of streamTutorMessage({
        input: finalPrompt,
        messages,
        maxSteps: 8
      })) {
        if (event.type === "done") {
          continue;
        }

        const message = event.message;
        setMessages((current) => [...current, message]);

        if (message.role === "tool-call") {
          pendingInvalidations.current.push(invalidationsForToolCall(message));
        }

        if (message.role === "tool-result") {
          const keys = pendingInvalidations.current.shift() ?? [];
          if (!message.isFailure) {
            applyInvalidations(keys, {
              refreshArtifacts,
              refreshMaterials
            });
          }
        }
      }

      setInput("");
    } catch {
      setError("No se pudo completar la respuesta. Comprueba la conexión e inténtalo de nuevo.");
    } finally {
      setIsSending(false);
    }
  };

  // Group messages for friendly rendering (folding tool calls into an elegant reasoning box)
  const groupedItems = useMemo(() => {
    const items: ChatItem[] = [];
    let currentTools: AgentMessage[] = [];

    const flushTools = () => {
      if (currentTools.length > 0) {
        items.push({
          kind: "tools",
          items: [...currentTools]
        });
        currentTools = [];
      }
    };

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg) continue;

      if (msg.role === "user") {
        flushTools();
        items.push({ kind: "user", message: msg as AgentMessage & { role: "user" } });
      } else if (msg.role === "tool-call" || msg.role === "tool-result") {
        currentTools.push(msg);
      } else if (msg.role === "assistant") {
        flushTools();
        items.push({
          kind: "assistant",
          message: msg as AgentMessage & { role: "assistant" }
        });
      }
    }
    flushTools();

    return items;
  }, [messages, isSending]);

  return (
    <section
      aria-label="Tutor de estudio"
      className={`grid h-full min-h-0 max-h-full min-w-0 grid-rows-[auto_1fr_auto] flex-1 transition-colors ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-[#090d16] text-slate-100"
      }`}
    >
      {/* Header */}
      <header
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 pr-14 backdrop-blur z-10 transition-colors min-[1440px]:pr-5 ${
          isLight ? "border-slate-200 bg-white/90" : "border-slate-800 bg-slate-950/80"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`grid size-9 place-items-center rounded-xl border ${
              isLight
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
            }`}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              local_library
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className={`font-display font-bold text-base sm:text-lg leading-none ${
                  isLight ? "text-slate-900" : "text-slate-100"
                }`}
              >
                Tutor de estudio
              </h1>
              <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-500">
                con IA
              </span>
            </div>
            <p className={`text-[11px] mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Pregunta, repasa y practica con tus materiales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tutor Mode Selector */}
          <div
            className={`flex items-center rounded-xl p-0.5 text-xs border ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
            }`}
            role="group"
            aria-label="Modo de tutoría"
          >
            <button
              type="button"
              onClick={() => setTutorMode("explanatory")}
              aria-pressed={tutorMode === "explanatory"}
              className={`min-h-9 px-2.5 py-1 rounded-lg font-medium transition ${
                tutorMode === "explanatory"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Explicaciones claras y directas con ejemplos"
            >
              Explicativo
            </button>
            <button
              type="button"
              onClick={() => setTutorMode("socratic")}
              aria-pressed={tutorMode === "socratic"}
              className={`min-h-9 px-2.5 py-1 rounded-lg font-medium transition ${
                tutorMode === "socratic"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Guía socrática para que deduzcas los conceptos"
            >
              Socrático
            </button>
          </div>

          {onToggleMaximize && (
            <button
              type="button"
              onClick={onToggleMaximize}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isMaximized
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                  : isLight
                  ? "border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-sm"
                  : "border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800"
              }`}
              title={
                isMaximized
                  ? "Salir de Modo Chat Completo (Restaurar espacio de estudio)"
                  : "Modo Chat Completo (Pantalla Completa)"
              }
              aria-label={
                isMaximized
                  ? "Salir de Modo Chat Completo"
                  : "Modo Chat Completo"
              }
            >
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                {isMaximized ? "close_fullscreen" : "open_in_full"}
              </span>
              <span className="hidden sm:inline">
                {isMaximized ? "Restaurar" : "Modo Chat"}
              </span>
            </button>
          )}

          <button
            className={`p-1.5 rounded-xl border transition ${
              isLight
                ? "border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                : "border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            type="button"
            onClick={() => setMessages([])}
            disabled={messages.length === 0}
            title="Limpiar conversación"
            aria-label="Limpiar conversación"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              restart_alt
            </span>
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <section className="flex flex-col gap-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="m-auto w-full max-w-2xl text-center py-6">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl border border-indigo-500/20 bg-indigo-600/10 text-indigo-500">
              <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                menu_book
              </span>
            </div>
            <h2
              className={`font-display font-bold text-2xl sm:text-3xl mb-2 ${
                isLight ? "text-slate-900" : "text-slate-100"
              }`}
            >
              ¿Qué quieres estudiar?
            </h2>
            <p className={`text-xs sm:text-sm max-w-md mx-auto mb-8 leading-relaxed ${
              isLight ? "text-slate-600" : "text-slate-400"
            }`}>
              Pregunta sobre tus materiales o elige una forma de empezar.
            </p>

            {/* Quick Starters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {starterPrompts.map((item, idx) => (
                <button
                  key={idx}
                  className={`group flex items-start gap-3 rounded-xl border p-3.5 transition ${
                    isLight
                      ? "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-800 shadow-sm"
                      : "border-slate-800/80 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900 text-slate-200"
                  }`}
                  type="button"
                  onClick={() => void submit(item.prompt)}
                >
                  <span className="material-symbols-outlined text-indigo-500 text-lg" aria-hidden="true">
                    {item.icon}
                  </span>
                  <div>
                    <strong
                      className={`block text-xs font-semibold group-hover:text-indigo-600 ${
                        isLight ? "text-slate-900" : "text-slate-200"
                      }`}
                    >
                      {item.label}
                    </strong>
                    <span className={`text-[11px] line-clamp-1 mt-0.5 ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}>
                      {item.prompt}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          groupedItems.map((item, index) => {
            if (item.kind === "user") {
              return (
                <article key={index} className="ui-enter flex flex-col gap-1 max-w-2xl self-end items-end">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-indigo-500 px-1">
                    Tú
                  </span>
                  <div className="rounded-xl rounded-br-sm bg-indigo-600 p-4 text-sm leading-relaxed text-white sm:p-5 whitespace-pre-wrap">
                    {item.message.content}
                  </div>
                </article>
              );
            }

            if (item.kind === "tools") {
              return (
                <ReasoningFlowBox
                  key={index}
                  items={item.items}
                  isThinking={isSending && index === groupedItems.length - 1}
                  isLight={isLight}
                />
              );
            }

            return (
              <article key={index} className="ui-enter flex flex-col gap-1.5 max-w-3xl self-start items-start w-full">
                <div className="flex items-center gap-2 px-1">
                  <span className={`text-[11px] font-mono font-semibold uppercase tracking-wider ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}>
                    Tutor
                  </span>
                </div>

                <div
                  className={`w-full rounded-xl rounded-bl-sm border p-5 transition-colors sm:p-6 ${
                    isLight
                      ? "bg-white border-slate-200 text-slate-800"
                      : "bg-slate-900/90 border-slate-800 text-slate-100"
                  }`}
                >
                  <div className="prose dark:prose-invert max-w-none text-sm space-y-2">
                    <Streamdown>{item.message.content}</Streamdown>
                  </div>

                  {/* Quick Action Buttons */}
                  {index === groupedItems.length - 1 && (
                    <div
                      className={`mt-4 flex flex-wrap items-center gap-2 border-t pt-3 ${
                        isLight ? "border-slate-100" : "border-slate-800/80"
                      }`}
                    >
                      <span className="mr-1 text-[11px] font-medium text-slate-400">Continuar con</span>
                      {onOpenMindMap && (
                        <button
                          type="button"
                          onClick={() => onOpenMindMap()}
                          className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                            isLight
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                              : "border-indigo-800/50 bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60"
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs" aria-hidden="true">schema</span>
                          <span>Ver esquema</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void submit("Genera un quiz de 5 preguntas basado en esta explicación.")}
                        className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          isLight
                            ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "border-slate-700/60 bg-slate-800/80 text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs" aria-hidden="true">quiz</span>
                        <span>Crear quiz</span>
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}

        {isSending && groupedItems.length > 0 && groupedItems.at(-1)?.kind !== "tools" && (
          <div className={`ui-enter flex max-w-xs items-center gap-2.5 rounded-xl border p-3.5 text-xs ${
            isLight
              ? "bg-indigo-50 border-indigo-200 text-indigo-700"
              : "bg-indigo-950/40 border-indigo-800/40 text-indigo-300"
          }`}>
            <div className="size-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
            <span>El tutor está preparando tu respuesta…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </section>

      {error !== undefined && (
        <div
          role="alert"
          aria-live="assertive"
          className={`mx-4 mb-2 rounded-lg border p-3 text-xs ${
            isLight
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-red-900 bg-red-950/40 text-red-200"
          }`}
        >
          {error}
        </div>
      )}

      {/* Input Prompt Form */}
      <footer
        className={`border-t p-4 backdrop-blur transition-colors ${
          isLight ? "border-slate-200 bg-white/90" : "border-slate-800 bg-slate-950/90"
        }`}
      >
        <form
          className={`flex flex-col gap-2 rounded-xl border p-2 transition focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/30 ${
            isLight
              ? "border-slate-300 bg-slate-50 text-slate-900"
              : "border-slate-800 bg-slate-900 text-slate-100"
          }`}
          onSubmit={(event) => {
            event.preventDefault();
            void submit(input);
          }}
        >
          <textarea
            className={`w-full resize-none bg-transparent px-3 py-2 text-sm outline-none ${
              isLight ? "text-slate-900 placeholder:text-slate-400" : "text-slate-100 placeholder:text-slate-500"
            }`}
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(input);
              }
            }}
            placeholder={
              tutorMode === "socratic"
                ? "Pregunta algo al tutor (Modo Socrático activo)…"
                : "Haz una pregunta sobre tus materiales o pide un quiz…"
            }
            rows={2}
          />
          <div
            className={`flex items-center justify-between pt-1 px-2 border-t ${
              isLight ? "border-slate-200" : "border-slate-800/50"
            }`}
          >
            <span className={`text-[11px] font-mono ${isLight ? "text-slate-400" : "text-slate-500"}`}>
              Enter para enviar · Shift+Enter nueva línea
            </span>
            <button
              className="flex min-h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              type="submit"
              disabled={isSending || input.trim().length === 0}
            >
              <span>{isSending ? "Pensando…" : "Enviar"}</span>
              <span className="material-symbols-outlined text-xs">arrow_upward</span>
            </button>
          </div>
        </form>
      </footer>
    </section>
  );
}

/** Groups tool activity into a concise, user-facing progress summary. */
function ReasoningFlowBox({
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
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
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
function getFriendlyToolCallLabel(message: AgentMessage): {
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
