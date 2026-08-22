import type { AgentMessage } from "@proxus/shared";
import type { RefObject } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { splitMentionParts } from "../../hooks/useMentions.ts";
import { ArtifactChatCard } from "../ArtifactChatCard.tsx";
import { ProxoFrameAnimation } from "../ProxoFrameAnimation.tsx";
import { conversationHasNoteArtifact, extractArtifactIds } from "./group-chat-items.ts";
import { cleanAssistantContent, parseUserContent } from "./parse-user-content.ts";
import { ReasoningFlowBox, TutorThinkingBubble } from "./ChatReasoning.tsx";
import { starterPrompts, type AssistantReveal, type ChatItem, type ChatMaterial, type TutorMode } from "./types.ts";

export function ChatMessageList({
  groupedItems,
  messages,
  availableMaterials,
  isSending,
  isTutorWriting,
  assistantReveal,
  tutorMode,
  isLight,
  messagesEndRef,
  onSubmit,
  onSetTutorMode,
  onSelectArtifact,
  onOpenMindMap
}: {
  readonly groupedItems: readonly ChatItem[];
  readonly messages: readonly AgentMessage[];
  readonly availableMaterials: readonly ChatMaterial[];
  readonly isSending: boolean;
  readonly isTutorWriting: boolean;
  readonly assistantReveal: AssistantReveal | null;
  readonly tutorMode: TutorMode;
  readonly isLight: boolean;
  readonly messagesEndRef: RefObject<HTMLDivElement | null>;
  readonly onSubmit: (prompt: string) => void;
  readonly onSetTutorMode: (mode: TutorMode) => void;
  readonly onSelectArtifact?: ((id: string) => void) | undefined;
  readonly onOpenMindMap?: (() => void) | undefined;
}) {
  return (
    <section
      className={`chat-message-scroll relative flex flex-col gap-4 overflow-y-auto p-4 sm:p-6 ${
        isLight ? "bg-slate-50/80" : "bg-[#090d16]"
      }`}
      aria-live="polite"
    >
      {messages.length === 0 ? (
        <div className="m-auto w-full max-w-2xl text-center py-6">
          <div className="relative mx-auto mb-3 inline-block">
            <ProxoFrameAnimation
              mode={tutorMode}
              state="idle"
              variant="transparent"
              size="xl"
              interactive={true}
              isLight={isLight}
            />
          </div>
          <h2
            className={`font-display font-bold text-2xl sm:text-3xl mb-1.5 ${
              isLight ? "text-slate-900" : "text-slate-100"
            }`}
          >
            ¡Hola! Soy Proxo
          </h2>
          <p
            className={`text-xs sm:text-sm max-w-md mx-auto mb-8 leading-relaxed ${
              isLight ? "text-slate-600" : "text-slate-400"
            }`}
          >
            Tu tutor de estudio con IA. Pregúntame sobre tus apuntes, genera exámenes y esquemas o resuelve dudas difíciles.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {starterPrompts.map((item, idx) => (
              <button
                key={idx}
                className={`group flex items-start gap-3 rounded-xl border p-3.5 transition-all duration-200 active:scale-[0.98] ${
                  isLight
                    ? "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-800 shadow-xs hover:shadow-sm"
                    : "border-slate-800/80 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900 text-slate-200"
                }`}
                type="button"
                onClick={() => {
                  if (item.mode) {
                    onSetTutorMode(item.mode);
                  }
                  void onSubmit(item.prompt);
                }}
              >
                <span
                  className="material-symbols-outlined text-indigo-500 text-xl shrink-0 mt-0.5 group-hover:scale-110 transition-transform"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <strong
                    className={`block text-xs font-semibold group-hover:text-indigo-600 transition-colors ${
                      isLight ? "text-slate-900" : "text-slate-200"
                    }`}
                  >
                    {item.label}
                  </strong>
                  <span
                    className={`block text-[11px] line-clamp-1 mt-0.5 ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {item.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        groupedItems.map((item, index) => {
          if (item.kind === "user") {
            const { docs, text } = parseUserContent(item.message.content, availableMaterials);
            return (
              <article key={index} className="ui-enter flex flex-col gap-1 max-w-2xl self-end items-end">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-indigo-500 px-1">
                  Tú
                </span>
                <div className="rounded-2xl rounded-br-sm bg-indigo-600 p-3.5 sm:p-4 text-sm leading-relaxed text-white shadow-md shadow-indigo-600/20">
                  {docs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {docs.map((doc, dIdx) => (
                        <div
                          key={dIdx}
                          className="inline-flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/25 backdrop-blur-md px-2.5 py-1.5 text-xs text-white border border-white/30 shadow-sm transition"
                        >
                          <span className="material-symbols-outlined text-[16px] text-red-300">picture_as_pdf</span>
                          <span className="font-semibold truncate max-w-[200px] sm:max-w-[280px]">{doc.title}</span>
                          {doc.pageCount && (
                            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
                              {doc.pageCount} pág{doc.pageCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {text ? (
                    <div className="whitespace-pre-wrap">
                      {splitMentionParts(text, [...availableMaterials, ...docs]).map((part, pIdx) =>
                        part.kind === "mention" ? (
                          <strong key={pIdx} className="font-bold text-white">
                            {part.value}
                          </strong>
                        ) : (
                          <span key={pIdx}>{part.value}</span>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-white/80 italic">Consultando documento adjunto…</div>
                  )}
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

          const isCurrentlyWriting =
            isTutorWriting &&
            index === groupedItems.length - 1 &&
            item.message.content === assistantReveal?.content;

          const artifactIds = item.hideArtifactWidgets
            ? []
            : extractArtifactIds(item.message.content, item.associatedTools);

          return (
            <article key={index} className="ui-enter flex max-w-3xl self-start items-start gap-2.5">
              <ProxoFrameAnimation
                mode={tutorMode}
                state={isCurrentlyWriting ? "talking" : "idle"}
                size="sm"
                isLight={isLight}
                className="mt-1 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2 px-1">
                  <span className={`text-[11px] font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                    Proxo
                  </span>
                  {tutorMode === "socratic" && (
                    <span className="rounded-full bg-purple-500/15 border border-purple-500/20 text-purple-600 dark:text-purple-300 px-1.5 py-0.2 text-[9px] font-semibold">
                      Socrático
                    </span>
                  )}
                  {isCurrentlyWriting ? (
                    <span className="flex items-center gap-1 text-[10px] text-indigo-500">
                      <span className="size-1.5 animate-pulse rounded-full bg-indigo-500" />
                      escribiendo
                    </span>
                  ) : (
                    <span className={`text-[10px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>ahora</span>
                  )}
                </div>

                <div
                  className={`w-fit max-w-full rounded-2xl rounded-bl-sm border p-4 transition-colors sm:p-5 ${
                    isLight
                      ? "bg-white border-slate-200 text-slate-800 shadow-sm"
                      : "bg-slate-900/90 border-slate-800 text-slate-100 shadow-lg shadow-black/10"
                  }`}
                >
                  <div className="prose dark:prose-invert max-w-none text-sm space-y-2">
                    <Streamdown>
                      {isCurrentlyWriting
                        ? cleanAssistantContent(item.message.content, { hasArtifactWidget: artifactIds.length > 0 }).slice(0, assistantReveal?.visibleLength ?? 0)
                        : cleanAssistantContent(item.message.content, { hasArtifactWidget: artifactIds.length > 0 })}
                    </Streamdown>
                    {isCurrentlyWriting && (
                      <span
                        aria-label="El tutor está escribiendo"
                        className="ui-typing-caret ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.16em] rounded-full bg-indigo-500 align-baseline"
                      />
                    )}
                  </div>

                  {artifactIds.length > 0 && (
                    <div className="flex flex-col gap-2.5 my-3">
                      {artifactIds.map((artId) => (
                        <ArtifactChatCard
                          key={artId}
                          artifactId={artId}
                          onOpenInWorkspace={(id) => onSelectArtifact?.(id)}
                          onOpenMindMap={onOpenMindMap}
                          isLight={isLight}
                        />
                      ))}
                    </div>
                  )}

                  {artifactIds.length === 0 && index === groupedItems.length - 1 && !isCurrentlyWriting && (
                    <div
                      className={`mt-4 flex flex-wrap items-center gap-2 border-t pt-3 ${
                        isLight ? "border-slate-100" : "border-slate-800/80"
                      }`}
                    >
                      <span className="mr-1 text-[11px] font-medium text-slate-400">Continuar con</span>
                      {onOpenMindMap && (
                        <button
                          type="button"
                          onClick={() => {
                            if (conversationHasNoteArtifact(messages)) {
                              onOpenMindMap();
                            } else {
                              void onSubmit(
                                "Genera una nota de estudio estructurada con el esquema conceptual detallado de este tema."
                              );
                              onOpenMindMap();
                            }
                          }}
                          className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                            isLight
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                              : "border-indigo-800/50 bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60"
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs" aria-hidden="true">
                            schema
                          </span>
                          <span>Ver esquema</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void onSubmit("Genera un quiz de 5 preguntas basado en esta explicación.")}
                        className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          isLight
                            ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "border-slate-700/60 bg-slate-800/80 text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs" aria-hidden="true">
                          quiz
                        </span>
                        <span>Crear quiz</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })
      )}

      {isSending && !isTutorWriting && groupedItems.at(-1)?.kind !== "tools" && (
        <TutorThinkingBubble isLight={isLight} mode={tutorMode} />
      )}

      <div ref={messagesEndRef} />
    </section>
  );
}
