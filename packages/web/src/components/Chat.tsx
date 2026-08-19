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
    icon: "list_alt",
    label: "Listar materiales",
    prompt: "Lista los materiales y apuntes que tengo subidos."
  },
  {
    icon: "quiz",
    label: "Crear Quiz de práctica",
    prompt: "Crea un quiz de 3 preguntas de opción múltiple basado en mis materiales subidos."
  },
  {
    icon: "psychology",
    label: "Modo Socrático",
    prompt: "Explícame el concepto más difícil de mis materiales de forma socrática, haciéndome preguntas para que lo deduzca."
  },
  {
    icon: "summarize",
    label: "Resumen clave",
    prompt: "Crea una nota de estudio estructurada con los puntos clave y fórmulas de mis materiales."
  }
] as const;

type TutorMode = "socratic" | "explanatory";

interface ChatProps {
  readonly prefillPrompt?: string | null | undefined;
  readonly onClearPrefill?: (() => void) | undefined;
  readonly onSelectArtifact?: ((id: string) => void) | undefined;
  readonly onOpenMindMap?: (() => void) | undefined;
  readonly theme?: "dark" | "light" | undefined;
  readonly onToggleTheme?: (() => void) | undefined;
}

type ChatItem =
  | { readonly kind: "user"; readonly message: AgentMessage & { readonly role: "user" } }
  | { readonly kind: "tools"; readonly items: readonly AgentMessage[]; readonly active: boolean }
  | { readonly kind: "assistant"; readonly message: AgentMessage & { readonly role: "assistant" }; readonly isLatest: boolean };

export function Chat({
  prefillPrompt,
  onClearPrefill,
  onSelectArtifact,
  onOpenMindMap,
  theme = "dark"
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
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
          items: [...currentTools],
          active: isSending && items.length === 0
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
        const isLatest = i === messages.length - 1;
        items.push({
          kind: "assistant",
          message: msg as AgentMessage & { role: "assistant" },
          isLatest
        });
      }
    }
    flushTools();

    return items;
  }, [messages, isSending]);

  return (
    <main
      className={`grid h-screen max-h-screen min-w-0 grid-rows-[auto_1fr_auto] max-md:h-auto max-md:max-h-none flex-1 transition-colors ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-[#090d16] text-slate-100"
      }`}
    >
      {/* Header */}
      <header
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 backdrop-blur z-10 transition-colors ${
          isLight ? "border-slate-200 bg-white/90" : "border-slate-800 bg-slate-950/80"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-600/30">
            <span className="material-symbols-outlined text-lg">smart_toy</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className={`font-display font-bold text-base sm:text-lg leading-none ${
                  isLight ? "text-slate-900" : "text-slate-100"
                }`}
              >
                Tutor Académico IA
              </h1>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-600/10 text-indigo-500 border border-indigo-500/20">
                Gemini
              </span>
            </div>
            <p className={`text-[11px] mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Asistente pedagógico contextual
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tutor Mode Selector */}
          <div
            className={`flex items-center rounded-xl p-0.5 text-xs border ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
            }`}
          >
            <button
              type="button"
              onClick={() => setTutorMode("explanatory")}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
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
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
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
          >
            <span className="material-symbols-outlined text-base">restart_alt</span>
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <section className="flex flex-col gap-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="m-auto w-full max-w-2xl text-center py-6">
            <div className="grid size-16 place-items-center rounded-3xl bg-indigo-600/10 text-indigo-500 border border-indigo-500/20 mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">psychology_alt</span>
            </div>
            <h2
              className={`font-display font-bold text-2xl sm:text-3xl mb-2 ${
                isLight ? "text-slate-900" : "text-slate-100"
              }`}
            >
              ¿En qué te puedo ayudar hoy?
            </h2>
            <p className={`text-xs sm:text-sm max-w-md mx-auto mb-8 leading-relaxed ${
              isLight ? "text-slate-600" : "text-slate-400"
            }`}>
              Haz preguntas sobre tus PDFs subidos, solicita quizzes de práctica o pide explicaciones paso a paso.
            </p>

            {/* Quick Starters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {starterPrompts.map((item, idx) => (
                <button
                  key={idx}
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 transition group ${
                    isLight
                      ? "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-800 shadow-sm"
                      : "border-slate-800/80 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900 text-slate-200"
                  }`}
                  type="button"
                  onClick={() => void submit(item.prompt)}
                >
                  <span className="material-symbols-outlined text-indigo-500 text-lg group-hover:scale-110 transition">
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
                <article key={index} className="flex flex-col gap-1 max-w-2xl self-end items-end">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-indigo-500 px-1">
                    Tú
                  </span>
                  <div className="p-4 sm:p-5 rounded-2xl bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-950/20 text-sm leading-relaxed whitespace-pre-wrap">
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
              <article key={index} className="flex flex-col gap-1.5 max-w-3xl self-start items-start w-full">
                <div className="flex items-center gap-2 px-1">
                  <span className={`text-[11px] font-mono font-semibold uppercase tracking-wider ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}>
                    Tutor
                  </span>
                  <span className="size-1.5 rounded-full bg-emerald-500"></span>
                </div>

                <div
                  className={`w-full p-5 sm:p-6 rounded-2xl border rounded-bl-sm shadow-xl transition-colors ${
                    isLight
                      ? "bg-white border-slate-200 text-slate-800 shadow-slate-200/50"
                      : "bg-slate-900/90 border-slate-800 text-slate-100 shadow-black/40"
                  }`}
                >
                  <TypewriterStreamdown
                    content={item.message.content}
                    animate={item.isLatest}
                    onUpdate={scrollToBottom}
                  />

                  {/* Quick Action Buttons */}
                  <div
                    className={`mt-4 pt-3 border-t flex flex-wrap items-center gap-2 ${
                      isLight ? "border-slate-100" : "border-slate-800/80"
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase font-semibold text-slate-400 mr-1">
                      Acciones rápidas:
                    </span>
                    {onOpenMindMap && (
                      <button
                        type="button"
                        onClick={() => onOpenMindMap()}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition ${
                          isLight
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                            : "bg-indigo-950/60 border-indigo-800/50 text-indigo-300 hover:bg-indigo-900/60"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">schema</span>
                        <span>🗺️ Ver Esquema Mental</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void submit("Genera un test evaluable de 5 preguntas tipo test basado en esta explicación.")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                        isLight
                          ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                          : "bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">quiz</span>
                      <span>🎯 Crear Test (5 preg)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void submit("Crea una nota de estudio estructurada con este contenido.")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                        isLight
                          ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                          : "bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">edit_note</span>
                      <span>📝 Guardar Nota</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void submit("[Modo Socrático] Hazme una pregunta de razonamiento sobre este tema para comprobar mi nivel.")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                        isLight
                          ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                          : "bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">psychology</span>
                      <span>🧠 Pregunta de Repaso</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}

        {isSending && groupedItems.length > 0 && groupedItems.at(-1)?.kind !== "tools" && (
          <div className={`flex items-center gap-2.5 text-xs p-3.5 rounded-2xl border max-w-xs animate-pulse ${
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
        <div className="mx-4 mb-2 p-3 rounded-xl border border-red-900 bg-red-950/40 text-red-200 text-xs">
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
          className={`flex flex-col gap-2 rounded-2xl border p-2 focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/30 transition ${
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
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 font-semibold text-xs text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:cursor-not-allowed disabled:opacity-40 transition"
              type="submit"
              disabled={isSending || input.trim().length === 0}
            >
              <span>{isSending ? "Pensando…" : "Enviar"}</span>
              <span className="material-symbols-outlined text-xs">arrow_upward</span>
            </button>
          </div>
        </form>
      </footer>
    </main>
  );
}

/**
 * Friendly reasoning box grouping all tool steps with clean, human-like activity labels
 */
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
  const [showJson, setShowJson] = useState(false);

  // Group into logical steps (call + result)
  const steps = useMemo(() => {
    const result: Array<{
      id: string;
      icon: string;
      title: string;
      subtitle?: string | undefined;
      isDone: boolean;
      isFailure?: boolean | undefined;
      rawCall?: AgentMessage | undefined;
      rawResult?: AgentMessage | undefined;
    }> = [];

    for (const msg of items) {
      if (msg.role === "tool-call") {
        const friendly = getFriendlyToolCallLabel(msg);
        result.push({
          id: `${msg.name}-${result.length}`,
          icon: friendly.icon,
          title: friendly.title,
          subtitle: friendly.subtitle,
          isDone: false,
          rawCall: msg
        });
      } else if (msg.role === "tool-result") {
        const lastStep = result.at(-1);
        if (lastStep) {
          lastStep.isDone = true;
          lastStep.isFailure = msg.isFailure;
          lastStep.rawResult = msg;
        }
      }
    }

    return result;
  }, [items]);

  const activeStep = steps.find((s) => !s.isDone) ?? steps.at(-1);

  return (
    <div className="w-full max-w-3xl my-1">
      <div
        className={`rounded-2xl border p-3 text-xs shadow-sm backdrop-blur transition ${
          isLight
            ? "border-indigo-200 bg-white/90 text-slate-700 shadow-slate-100"
            : "border-indigo-950/80 bg-slate-950/60 text-slate-300"
        }`}
      >
        {/* Summary Header */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between cursor-pointer select-none group"
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`grid size-6 place-items-center rounded-lg ${
                isLight
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-indigo-600/20 text-indigo-400"
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isThinking ? "psychology" : "check_circle"}
              </span>
            </span>
            <div>
              <span
                className={`font-semibold ${
                  isLight ? "text-slate-800" : "text-slate-200"
                }`}
              >
                {isThinking
                  ? activeStep?.title ?? "Razonando y analizando apuntes…"
                  : `Proceso de razonamiento y consulta (${steps.length} pasos)`}
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
              className={`text-[11px] font-mono transition ${
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
            >
              expand_more
            </span>
          </div>
        </div>

        {/* Expanded Steps List */}
        {isOpen && (
          <div
            className={`mt-3 pt-3 border-t space-y-2 ${
              isLight ? "border-slate-200" : "border-slate-800/70"
            }`}
          >
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs ${
                  isLight
                    ? "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-slate-900/50 border-slate-800/50 text-slate-300"
                }`}
              >
                <span className="material-symbols-outlined text-sm text-indigo-500 mt-0.5">
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
                          ? "bg-indigo-100 text-indigo-700 animate-pulse"
                          : "bg-indigo-950 text-indigo-300 animate-pulse"
                      }`}
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
              </div>
            ))}

            {/* Technical JSON Toggle */}
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowJson(!showJson)}
                className={`text-[10px] font-mono underline ${
                  isLight
                    ? "text-slate-500 hover:text-slate-700"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {showJson ? "Ocultar JSON técnico" : "Ver JSON técnico (dev)"}
              </button>

              {showJson && (
                <div className="mt-2 space-y-2 text-left">
                  {items.map((msg, idx) => (
                    <pre
                      key={idx}
                      className={`overflow-x-auto rounded-xl p-2.5 text-[10px] font-mono border ${
                        isLight
                          ? "bg-slate-100 text-slate-800 border-slate-200"
                          : "bg-slate-950 text-slate-400 border-slate-800"
                      }`}
                    >
                      {JSON.stringify(msg, null, 2)}
                    </pre>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Typewriter effect component that progressively streams text token by token
 */
function TypewriterStreamdown({
  content,
  animate,
  onUpdate
}: {
  readonly content: string;
  readonly animate: boolean;
  readonly onUpdate?: () => void;
}) {
  const [displayedLength, setDisplayedLength] = useState<number>(animate ? 0 : content.length);
  const isComplete = displayedLength >= content.length;

  useEffect(() => {
    if (!animate) {
      setDisplayedLength(content.length);
      return;
    }

    setDisplayedLength(0);
    const total = content.length;
    let current = 0;

    // Fast and smooth token streaming rhythm (~15-25 chars per tick)
    const interval = setInterval(() => {
      current = Math.min(total, current + 18);
      setDisplayedLength(current);
      onUpdate?.();

      if (current >= total) {
        clearInterval(interval);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [content, animate]);

  const displayedContent = content.slice(0, displayedLength);

  return (
    <div className="prose prose-invert max-w-none text-sm space-y-2 relative">
      <Streamdown>{displayedContent}</Streamdown>
      {!isComplete && (
        <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-1 animate-pulse align-middle rounded-sm" />
      )}
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
          title: "Activando módulo de lectura de apuntes",
          subtitle: "Preparando herramientas de inspección visual de PDF"
        };
      }
      if (skillName.includes("artifact")) {
        return {
          icon: "edit_note",
          title: "Activando generador de ejercicios y pruebas",
          subtitle: "Preparando herramientas para crear notas, quizzes y tests"
        };
      }
      return {
        icon: "psychology",
        title: "Consultando guía pedagógica",
        subtitle: skillName
      };
    }

    if (message.name === "cli") {
      const input =
        typeof message.input === "object" && message.input && "input" in message.input
          ? String((message.input as { input: unknown }).input)
          : "";

      if (input.startsWith("materials view")) {
        const parts = input.split(" ");
        const mat = parts[2] || "documento";
        const pages = parts[3] ? `(páginas ${parts[3]})` : "";
        return {
          icon: "visibility",
          title: `Leyendo ${mat} ${pages}`,
          subtitle: "Analizando contenido con visión multimodal y Poppler"
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
        title: "Procesando información de estudio",
        subtitle: input
      };
    }
  }

  return {
    icon: "smart_toy",
    title: "Procesando razonamiento"
  };
}
