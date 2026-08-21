import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { AgentMessage, ChatSession } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { knowledgeProfileQuery } from "../domain/knowledge/atoms.ts";
import { materialsQuery, uploadMaterialAction } from "../domain/materials/atoms.ts";
import { applyInvalidations, invalidationsForToolCall } from "../domain/tutor/invalidation.ts";
import { streamTutorMessage } from "../domain/tutor/stream.ts";
import {
  loadSavedSessions,
  saveSessions,
  createOrUpdateSession,
  deleteStoredSession,
  makeNewSessionId
} from "../domain/sessions/storage.ts";
import { ArtifactChatCard } from "./ArtifactChatCard.tsx";
import { ProxoFrameAnimation } from "./ProxoFrameAnimation.tsx";
import { ChatHistoryMenu } from "./ChatHistoryMenu.tsx";
import { useVoiceDictation } from "../hooks/useVoiceDictation.ts";
export {
  findMentionRanges,
  splitMentionParts,
  useMentions,
  type MentionRange,
  type MentionPart
} from "../hooks/useMentions.ts";
import {
  findMentionRanges,
  splitMentionParts,
  useMentions
} from "../hooks/useMentions.ts";
import proxoAvatar from "../assets/proxo-avatar.jpg";
import proxoSocraticAvatar from "../assets/proxo-socratic-avatar.jpg";

const starterPrompts = [
  {
    icon: "quiz",
    label: "Crear un quiz",
    description: "Crea un quiz de 3 preguntas tipo test con feedback",
    prompt: "Crea un quiz de 3 preguntas tipo test de mis materiales subidos con retroalimentación.",
    mode: undefined as TutorMode | undefined
  },
  {
    icon: "lightbulb",
    label: "Explicación con ejemplos",
    description: "Desglosa los puntos difíciles con claridad",
    prompt: "Explícame los conceptos más difíciles de mis apuntes de forma clara y con ejemplos prácticos.",
    mode: "explanatory" as TutorMode | undefined
  },
  {
    icon: "school",
    label: "Tutor Socrático",
    description: "Aprende deduciendo con preguntas guía",
    prompt: "Guíame con preguntas socráticas paso a paso para que razone por mí mismo este tema.",
    mode: "socratic" as TutorMode | undefined
  },
  {
    icon: "schema",
    label: "Esquema conceptual",
    description: "Estructura jerárquica con ideas clave",
    prompt: "Genera un esquema estructurado con las ideas principales y secundarias de este tema.",
    mode: undefined as TutorMode | undefined
  }
] as const;

export type TutorMode = "socratic" | "explanatory";

export interface ChatProps {
  readonly prefillPrompt?: string | null | undefined;
  readonly prefillAttachments?: readonly { readonly id: string; readonly title: string; readonly pageCount?: number | undefined }[] | undefined;
  readonly onClearPrefill?: (() => void) | undefined;
  readonly onSelectArtifact?: ((id: string) => void) | undefined;
  readonly onOpenMindMap?: (() => void) | undefined;
  readonly theme?: "dark" | "light" | undefined;
  readonly isMaximized?: boolean | undefined;
  readonly onToggleMaximize?: (() => void) | undefined;
  readonly onOpenProfile?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
}

type ChatItem =
  | { readonly kind: "user"; readonly message: AgentMessage & { readonly role: "user" } }
  | { readonly kind: "tools"; readonly items: readonly AgentMessage[] }
  | {
      readonly kind: "assistant";
      readonly message: AgentMessage & { readonly role: "assistant" };
      readonly associatedTools?: readonly AgentMessage[] | undefined;
    };

interface AssistantReveal {
  readonly id: number;
  readonly content: string;
  readonly visibleLength: number;
}

interface ParsedUserDoc {
  readonly id?: string | undefined;
  readonly title: string;
  readonly pageCount?: number | undefined;
}

function parseUserContent(
  rawContent: string,
  materials: readonly { readonly id: string; readonly title: string; readonly pageCount?: number }[]
): { readonly docs: readonly ParsedUserDoc[]; readonly text: string } {
  const foundDocs: ParsedUserDoc[] = [];
  const socraticPattern = /\[Enfoque pedagógico:\s*[^\]]+\]/g;
  let cleanText = rawContent.replace(socraticPattern, "").trim();

  // 1. Match [Documentos de referencia: ...]
  const refPattern = /\[Documentos de referencia:\s*([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = refPattern.exec(cleanText)) !== null) {
    const listStr = match[1]!;
    const items = listStr.split(",").map((s) => s.trim());
    for (const itm of items) {
      const matched = materials.find(
        (m) =>
          m.id.toLowerCase() === itm.toLowerCase() ||
          m.title.toLowerCase() === itm.toLowerCase() ||
          m.title.toLowerCase().includes(itm.toLowerCase())
      );
      if (matched) {
        if (!foundDocs.some((d) => d.id === matched.id)) {
          foundDocs.push({ id: matched.id, title: matched.title, pageCount: matched.pageCount });
        }
      } else if (!foundDocs.some((d) => d.title === itm)) {
        foundDocs.push({ title: itm });
      }
    }
  }
  cleanText = cleanText.replace(refPattern, "").trim();

  // 2. Match @["..."] (explicit quoted syntax)
  const quotedMentionPattern = /@\["([^"]+)"\]/g;
  while ((match = quotedMentionPattern.exec(cleanText)) !== null) {
    const term = match[1]!;
    const matched = materials.find(
      (m) =>
        m.id.toLowerCase() === term.toLowerCase() ||
        m.title.toLowerCase() === term.toLowerCase() ||
        m.title.toLowerCase().includes(term.toLowerCase())
    );
    if (matched) {
      if (!foundDocs.some((d) => d.id === matched.id)) {
        foundDocs.push({ id: matched.id, title: matched.title, pageCount: matched.pageCount });
      }
    } else {
      foundDocs.push({ title: term.replace(/[-_]/g, " ") });
    }
  }
  cleanText = cleanText.replace(quotedMentionPattern, "@$1");

  // 3. Match @slug or @tema-X or @word (e.g. @tema-4, @tema-4-organizacion-territorial, @constitucion)
  const inlineMentionPattern = /@([a-zA-Z0-9_\-\.]+)/g;
  while ((match = inlineMentionPattern.exec(cleanText)) !== null) {
    const term = match[1]!;
    const norm = term.toLowerCase().replace(/[-_]/g, " ").trim();
    const slug = term.toLowerCase().replace(/\s+/g, "-").trim();

    const matched = materials.find((m) => {
      const mId = m.id.toLowerCase();
      const mTitle = m.title.toLowerCase().replace(/[-_]/g, " ");
      return (
        mId === slug ||
        mId.startsWith(slug) ||
        mId.includes(slug) ||
        mTitle.includes(norm) ||
        norm.includes(mTitle)
      );
    });

    if (matched) {
      if (!foundDocs.some((d) => d.id === matched.id)) {
        foundDocs.push({ id: matched.id, title: matched.title, pageCount: matched.pageCount });
      }
    } else {
      foundDocs.push({ title: term.replace(/[-_]/g, " ") });
    }
  }

  return {
    docs: foundDocs,
    text: cleanText
  };
}

function cleanAssistantContent(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (/^(?:Tool call\s+)?[a-zA-Z0-9_-]+\s*:\s*(?:json=)?\{/i.test(trimmed)) {
    return "He preparado el recurso solicitado. Puedes revisarlo a continuación:";
  }
  return raw.replace(/^(?:Tool call\s+)?[a-zA-Z0-9_-]+\s*:\s*(?:json=)?\{[^\n]+\}\n*/gi, "").trim() || raw;
}

export function Chat({
  prefillPrompt,
  prefillAttachments,
  onClearPrefill,
  onSelectArtifact,
  onOpenMindMap,
  theme = "dark",
  isMaximized = false,
  onToggleMaximize,
  onOpenProfile,
  onClose
}: ChatProps = {}) {
  const isLight = theme === "light";
  // Conversation history and sessions state
  const [sessions, setSessions] = useState<readonly ChatSession[]>(() => loadSavedSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const saved = loadSavedSessions();
    return saved[0]?.id ?? makeNewSessionId();
  });
  const [messages, setMessages] = useState<readonly AgentMessage[]>(() => {
    const saved = loadSavedSessions();
    return saved[0]?.messages ?? [];
  });
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [assistantReveal, setAssistantReveal] = useState<AssistantReveal | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [tutorMode, setTutorMode] = useState<TutorMode>(() => {
    const saved = loadSavedSessions();
    return saved[0]?.mode ?? "explanatory";
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const historyMenuRef = useRef<HTMLDivElement>(null);

  // Auto-sync messages to current session
  useEffect(() => {
    if (messages.length > 0) {
      setSessions((prev) => {
        const next = createOrUpdateSession(prev, currentSessionId, messages, tutorMode);
        saveSessions(next);
        return next;
      });
    }
  }, [messages, currentSessionId, tutorMode]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const magIaRef = useRef<HTMLDivElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const assistantRevealIdRef = useRef(0);
  const pendingInvalidations = useRef<Array<ReturnType<typeof invalidationsForToolCall>>>([]);

  const [attachedDocs, setAttachedDocs] = useState<
    Array<{ readonly id: string; readonly title: string; readonly pageCount?: number | undefined }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isMagIaOpen, setIsMagIaOpen] = useState(false);

  const materialsResult = useAtomValue(materialsQuery);
  const availableMaterials = AsyncResult.match(materialsResult, {
    onInitial: () => [],
    onFailure: () => [],
    onSuccess: ({ value }) => value.materials
  });

  const refreshArtifacts = useAtomRefresh(artifactsQuery);
  const refreshMaterials = useAtomRefresh(materialsQuery);
  const refreshKnowledge = useAtomRefresh(knowledgeProfileQuery);
  const uploadMaterial = useAtomSet(uploadMaterialAction, { mode: "promise" });

  const {
    isListening,
    audioLevels,
    toggleListening,
    stopListening
  } = useVoiceDictation((text) => setInput(text));

  const {
    isMentionOpen,
    setIsMentionOpen,
    mentionQuery,
    setMentionQuery,
    selectedMentionIndex,
    setSelectedMentionIndex,
    filteredMentionMaterials,
    handleSelectMentionDoc,
    handleRemoveAttachedDoc
  } = useMentions(
    input,
    setInput,
    attachedDocs,
    setAttachedDocs,
    availableMaterials,
    textareaRef
  );

  const handleNewChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const newId = makeNewSessionId();
    setCurrentSessionId(newId);
    setMessages([]);
    setAssistantReveal(null);
    setIsHistoryOpen(false);
  }, []);

  const handleSelectSession = useCallback((session: ChatSession) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    if (session.mode) {
      setTutorMode(session.mode);
    }
    setAssistantReveal(null);
    setIsHistoryOpen(false);
  }, []);

  const handleDeleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => {
      const next = deleteStoredSession(prev, sessionId);
      saveSessions(next);
      return next;
    });
    setCurrentSessionId((curr) => {
      if (curr === sessionId) {
        setMessages([]);
        setAssistantReveal(null);
        return makeNewSessionId();
      }
      return curr;
    });
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (magIaRef.current && !magIaRef.current.contains(e.target as Node)) {
        setIsMagIaOpen(false);
      }
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setIsMentionOpen(false);
      }
      if (historyMenuRef.current && !historyMenuRef.current.contains(e.target as Node)) {
        setIsHistoryOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [setIsMentionOpen]);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
  }, []);

  const handleDirectFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setIsUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            if (!base64) return;
            const cleanTitle = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
            const res = await uploadMaterial({
              title: cleanTitle,
              fileName: file.name,
              contentBase64: base64
            });
            refreshMaterials();
            if (res && res.id) {
              setAttachedDocs((prev) => [
                ...prev.filter((d) => d.id !== res.id),
                { id: res.id, title: res.title, pageCount: res.pageCount }
              ]);
            }
          } catch (e) {
            console.error("Direct upload failed", e);
          } finally {
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Reader error", err);
        setIsUploading(false);
      }
    } else {
      setError("Solo se pueden adjuntar documentos en formato PDF.");
    }
    event.target.value = "";
  };

  useEffect(() => {
    if (prefillPrompt && !isSending) {
      setInput(prefillPrompt);
      if (prefillAttachments && prefillAttachments.length > 0) {
        setAttachedDocs((prev) => {
          const next = [...prev];
          for (const att of prefillAttachments) {
            if (!next.some((d) => d.id === att.id)) {
              next.push(att);
            }
          }
          return next;
        });
      }
      onClearPrefill?.();
    }
  }, [prefillPrompt, prefillAttachments, isSending, onClearPrefill]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const minH = 40;
    const maxH = 104; // ~3-4 lines limit before scroll
    const nextH = Math.min(Math.max(textarea.scrollHeight, minH), maxH);
    textarea.style.height = `${nextH}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxH ? "auto" : "hidden";
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, assistantReveal?.visibleLength]);

  const isTutorWriting = assistantReveal !== null;

  useEffect(() => {
    if (!assistantReveal) return;

    if (assistantReveal.visibleLength >= assistantReveal.content.length) {
      const finishTimer = window.setTimeout(() => setAssistantReveal(null), 420);
      return () => window.clearTimeout(finishTimer);
    }

    // Reveal a few characters at a time. The short cadence feels like writing
    // while keeping long answers quick enough to read during a demo.
    const revealTimer = window.setTimeout(() => {
      setAssistantReveal((current) => {
        if (!current || current.id !== assistantReveal.id) return current;
        const increment = Math.max(3, Math.min(10, Math.ceil(current.content.length / 120)));
        return {
          ...current,
          visibleLength: Math.min(current.content.length, current.visibleLength + increment)
        };
      });
    }, 18);

    return () => window.clearTimeout(revealTimer);
  }, [assistantReveal]);

  const submit = async (nextInput: string) => {
    const trimmed = nextInput.trim();
    if ((trimmed.length === 0 && attachedDocs.length === 0) || isSending || isTutorWriting) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const finalPrompt = trimmed || "Explícame los conceptos clave de este documento.";
    const activeMaterialIds = attachedDocs.map((d) => d.id);
    const documentReferences = attachedDocs.map((d) => d.title);
    const optimisticUserMessage: AgentMessage = { role: "user", content: finalPrompt };

    setAttachedDocs([]);
    setInput("");
    setMessages((current) => [...current, optimisticUserMessage]);
    setIsSending(true);
    setError(undefined);
    pendingInvalidations.current = [];

    try {
      for await (const event of streamTutorMessage(
        {
          input: finalPrompt,
          messages,
          mode: tutorMode,
          activeMaterialIds,
          documentReferences,
          maxSteps: 14
        },
        controller.signal
      )) {
        if (event.type === "done") {
          continue;
        }

        const message = event.message;
        // The user's message is rendered optimistically above so the turn
        // feels immediate. The server echoes it as the first stream event.
        if (message.role !== "user") {
          setMessages((current) => [...current, message]);
        }

        if (message.role === "assistant") {
          const revealId = assistantRevealIdRef.current + 1;
          assistantRevealIdRef.current = revealId;
          setAssistantReveal({
            id: revealId,
            content: message.content,
            visibleLength: 0
          });
        }

        if (message.role === "tool-call") {
          pendingInvalidations.current.push(invalidationsForToolCall(message));
        }

        if (message.role === "tool-result") {
          const keys = pendingInvalidations.current.shift() ?? [];
          if (!message.isFailure) {
            applyInvalidations(keys, {
              refreshArtifacts,
              refreshMaterials,
              refreshKnowledge
            });
          }
        }
      }

      setInput("");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (typeof err === "object" && err !== null && "name" in err && err.name === "AbortError") {
        return;
      }
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
        const toolsForTurn = [...currentTools];
        flushTools();
        items.push({
          kind: "assistant",
          message: msg as AgentMessage & { role: "assistant" },
          associatedTools: toolsForTurn
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
        className={`flex items-center justify-between gap-2 border-b px-4 py-3 pr-14 backdrop-blur z-10 transition-colors min-[1440px]:pr-4 ${
          isLight ? "border-slate-200 bg-white/90" : "border-slate-800 bg-slate-950/80"
        }`}
      >
        {/* Left Side: New Chat */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewChat}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-95 ${
              isLight
                ? "border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs"
                : "border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-200 shadow-2xs"
            }`}
            title="Iniciar un nuevo chat limpio con Proxo"
            aria-label="Nuevo chat"
          >
            <span className="material-symbols-outlined text-[16px] text-indigo-500">add</span>
            <span>Nuevo chat</span>
          </button>
        </div>

        {/* Right Side: History & Maximize */}
        <div className="flex items-center gap-2">

          {/* History Popover / Drawer Component */}
          <ChatHistoryMenu
            sessions={sessions}
            currentSessionId={currentSessionId}
            isOpen={isHistoryOpen}
            isLight={isLight}
            menuRef={historyMenuRef}
            onToggleOpen={() => setIsHistoryOpen((v) => !v)}
            onNewChat={handleNewChat}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
          />

          {onToggleMaximize && (
            <button
              type="button"
              onClick={onToggleMaximize}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
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
        </div>
      </header>

      {/* Messages Scroll Area */}
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
            <p className={`text-xs sm:text-sm max-w-md mx-auto mb-8 leading-relaxed ${
              isLight ? "text-slate-600" : "text-slate-400"
            }`}>
              Tu tutor de estudio con IA. Pregúntame sobre tus apuntes, genera exámenes y esquemas o resuelve dudas difíciles.
            </p>

            {/* Quick Starters Grid */}
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
                      setTutorMode(item.mode);
                    }
                    void submit(item.prompt);
                  }}
                >
                  <span className="material-symbols-outlined text-indigo-500 text-xl shrink-0 mt-0.5 group-hover:scale-110 transition-transform" aria-hidden="true">
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
                    <span className={`block text-[11px] line-clamp-1 mt-0.5 ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}>
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
                    <span className={`text-[11px] font-bold ${
                      isLight ? "text-slate-700" : "text-slate-200"
                    }`}>
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
                      <span className={`text-[10px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                        ahora
                      </span>
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
                          ? cleanAssistantContent(item.message.content).slice(0, assistantReveal?.visibleLength ?? 0)
                          : cleanAssistantContent(item.message.content)}
                      </Streamdown>
                      {isCurrentlyWriting && (
                        <span
                          aria-label="El tutor está escribiendo"
                          className="ui-typing-caret ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.16em] rounded-full bg-indigo-500 align-baseline"
                        />
                      )}
                    </div>

                    {/* Interactive Artifact Cards (if artifacts were created/referenced) */}
                    {(() => {
                      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
                      const textMatches = item.message.content.match(uuidRegex) ?? [];
                      const toolMatches: string[] = [];
                      if (item.associatedTools) {
                        for (const t of item.associatedTools) {
                          try {
                            const str = JSON.stringify(t);
                            const m = str.match(uuidRegex);
                            if (m) toolMatches.push(...m);
                          } catch {
                            // ignore
                          }
                        }
                      }
                      const artifactIds = Array.from(new Set([...textMatches, ...toolMatches]));
                      if (artifactIds.length === 0) return null;
                      return (
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
                      );
                    })()}

                    {/* Quick Action Buttons */}
                    {index === groupedItems.length - 1 && !isCurrentlyWriting && (
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
                              const hasNote = messages.some(
                                (m) =>
                                  (m.role === "tool-result" &&
                                    typeof m.result === "object" &&
                                    m.result !== null &&
                                    (m.result as any).kind === "note") ||
                                  (m.role === "tool-call" &&
                                    typeof m.input === "object" &&
                                    m.input !== null &&
                                    JSON.stringify(m.input).includes('"kind":"note"'))
                              );
                              if (hasNote) {
                                onOpenMindMap();
                              } else {
                                void submit("Genera una nota de estudio estructurada con el esquema conceptual detallado de este tema.");
                                onOpenMindMap();
                              }
                            }}
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

      {/* Input Prompt Form matching image design with MagIA & Voice Waveform */}
      <footer
        className={`border-t p-3 sm:p-4 backdrop-blur transition-colors ${
          isLight ? "border-slate-200 bg-white/80" : "border-slate-800/80 bg-slate-950/80"
        }`}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (isListening) stopListening();
            void submit(input);
          }}
          className={`relative rounded-[26px] border-2 border-[#8b5cf6] p-3 shadow-[0_0_20px_rgba(139,92,246,0.18)] focus-within:shadow-[0_0_28px_rgba(139,92,246,0.35)] transition-all ${
            isLight ? "bg-white text-slate-900" : "bg-[#0b101b] text-slate-100"
          }`}
        >
          {/* Hidden File Input for Paperclip Attach Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={handleDirectFileUpload}
            className="hidden"
            aria-hidden="true"
          />

          {/* Attached / Mentioned Documents Bar */}
          {(attachedDocs.length > 0 || isUploading) && (
            <div className="flex flex-wrap items-center gap-1.5 pb-2.5 mb-2 border-b border-purple-500/20">
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">attachment</span>
                <span>Referencia:</span>
              </span>
              {attachedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="inline-flex items-center gap-1.5 bg-purple-500/15 dark:bg-purple-500/25 border border-purple-500/30 rounded-xl px-2.5 py-1 text-xs text-purple-800 dark:text-purple-200 font-medium animate-in fade-in zoom-in-95 duration-100"
                >
                  <span className="material-symbols-outlined text-[15px] text-red-500">picture_as_pdf</span>
                  <span className="truncate max-w-[180px] sm:max-w-[240px] font-bold">{doc.title}</span>
                  {doc.pageCount && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400">({doc.pageCount} pág{doc.pageCount > 1 ? "s" : ""})</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachedDoc(doc.id, doc.title)}
                    className="grid size-4 place-items-center rounded-full hover:bg-purple-500/30 text-purple-600 dark:text-purple-400 transition ml-0.5"
                    title="Quitar referencia"
                  >
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </div>
              ))}
              {isUploading && (
                <div className="inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl px-2.5 py-1 text-xs text-indigo-400 font-medium animate-pulse">
                  <span className="size-2 rounded-full bg-indigo-500 animate-ping" />
                  <span>Subiendo documento…</span>
                </div>
              )}
            </div>
          )}

          {/* Real-time Inline Mention Autocomplete Floating Card */}
          {mentionQuery !== null && (
            <div
              className={`absolute bottom-full left-3 right-3 mb-2 max-h-56 overflow-y-auto rounded-2xl border p-2 shadow-2xl z-40 ui-scale-in ${
                isLight
                  ? "bg-white border-purple-200 text-slate-800"
                  : "bg-slate-900 border-purple-800/80 text-slate-100"
              }`}
            >
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">alternate_email</span>
                <span>Documentos coincidentes ({filteredMentionMaterials.length})</span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                {filteredMentionMaterials.length === 0 ? (
                  <p className="p-3 text-xs text-slate-500 text-center">No se encontraron documentos con "{mentionQuery}"</p>
                ) : (
                  filteredMentionMaterials.map((mat, idx) => (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => handleSelectMentionDoc(mat)}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-left transition ${
                        idx === selectedMentionIndex
                          ? "bg-purple-600 text-white shadow-sm"
                          : isLight
                          ? "hover:bg-purple-50 text-slate-700"
                          : "hover:bg-purple-950/40 text-slate-200"
                      }`}
                    >
                      <span className={`material-symbols-outlined text-base ${idx === selectedMentionIndex ? "text-white" : "text-red-500"}`}>
                        picture_as_pdf
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{mat.title}</p>
                        {mat.pageCount ? (
                          <p className={`text-[10px] truncate ${idx === selectedMentionIndex ? "text-purple-100" : "text-slate-400"}`}>
                            {mat.pageCount} páginas
                          </p>
                        ) : null}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${idx === selectedMentionIndex ? "bg-white/20 text-white" : "bg-purple-500/10 text-purple-600 dark:text-purple-400"}`}>
                        Adjuntar
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="relative w-full">
            {/* Live Backdrop for Styled Mentions */}
            <div
              ref={backdropRef}
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words px-2 py-1 text-sm font-sans font-normal leading-relaxed overflow-hidden select-none"
            >
              {input ? (
                <>
                  {splitMentionParts(input, [...availableMaterials, ...attachedDocs]).map((part, idx) =>
                    part.kind === "mention" ? (
                      <span
                        key={idx}
                        className={`rounded-xs ${
                          isLight
                            ? "bg-purple-100/90 text-purple-700"
                            : "bg-purple-900/60 text-purple-300"
                        }`}
                      >
                        {part.value}
                      </span>
                    ) : (
                      <span key={idx} className={isLight ? "text-slate-900" : "text-slate-100"}>
                        {part.value}
                      </span>
                    )
                  )}
                  {input.endsWith("\n") && "\n"}
                </>
              ) : (
                <span className="text-slate-400 font-normal">
                  {tutorMode === "socratic"
                    ? "Plantea una duda para deducirla paso a paso · @ para docs"
                    : "Pregunta lo que quieras · @ para mencionar docs"}
                </span>
              )}
            </div>

            <textarea
              ref={textareaRef}
              className="relative z-10 w-full resize-none bg-transparent px-2 py-1 text-sm outline-none text-transparent caret-purple-600 dark:caret-purple-400 selection:bg-purple-500/25 font-sans font-normal leading-relaxed"
              value={input}
              onScroll={(e) => {
                if (backdropRef.current) {
                  backdropRef.current.scrollTop = e.currentTarget.scrollTop;
                }
              }}
              onChange={(event) => {
                const val = event.currentTarget.value;
                setInput(val);

                // Auto-sync attachedDocs if mention was removed
                const docsList = [...availableMaterials, ...attachedDocs];
                const prevRanges = findMentionRanges(input, docsList);
                const nextRanges = findMentionRanges(val, docsList);

                setAttachedDocs((prev) =>
                  prev.filter((doc) => {
                    const wasMentioned = prevRanges.some(
                      (r) =>
                        r.title.toLowerCase() === doc.title.toLowerCase() ||
                        (doc.id && r.materialId === doc.id)
                    );
                    if (!wasMentioned) {
                      return true; // Keep documents not added via text mention
                    }
                    return nextRanges.some(
                      (r) =>
                        r.title.toLowerCase() === doc.title.toLowerCase() ||
                        (doc.id && r.materialId === doc.id)
                    );
                  })
                );

                const beforeCursor = val.slice(0, event.currentTarget.selectionStart ?? val.length);
                const mentionMatch = /(?:^|\s)@([a-zA-Z0-9_-]*)$/.exec(beforeCursor);
                if (mentionMatch) {
                  setMentionQuery(mentionMatch[1] ?? "");
                  setSelectedMentionIndex(0);
                } else {
                  setMentionQuery(null);
                }
              }}
              onKeyDown={(e) => {
                if (mentionQuery !== null && filteredMentionMaterials.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedMentionIndex((idx) => (idx + 1) % filteredMentionMaterials.length);
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedMentionIndex(
                      (idx) => (idx - 1 + filteredMentionMaterials.length) % filteredMentionMaterials.length
                    );
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    const selected =
                      filteredMentionMaterials[selectedMentionIndex] ?? filteredMentionMaterials[0];
                    if (selected) {
                      handleSelectMentionDoc(selected);
                      return;
                    }
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setMentionQuery(null);
                    return;
                  }
                }

                const textarea = textareaRef.current;
                if (textarea) {
                  const { selectionStart, selectionEnd } = textarea;
                  const docsList = [...availableMaterials, ...attachedDocs];
                  const ranges = findMentionRanges(input, docsList);

                  // Handle atomic mention deletion with Backspace
                  if (e.key === "Backspace") {
                    if (selectionStart === selectionEnd) {
                      const pos = selectionStart;
                      const targetRange = ranges.find((r) => {
                        const hasTrailingSpace = input[r.end] === " ";
                        const isRightAfterSpace = hasTrailingSpace && pos === r.end + 1;
                        const isInsideOrEnd = pos > r.start && pos <= r.end;
                        return isInsideOrEnd || isRightAfterSpace;
                      });

                      if (targetRange) {
                        e.preventDefault();
                        const hasTrailingSpace = input[targetRange.end] === " ";
                        const deleteEnd = hasTrailingSpace ? targetRange.end + 1 : targetRange.end;
                        const nextInput = input.slice(0, targetRange.start) + input.slice(deleteEnd);
                        setInput(nextInput);

                        const remainingRanges = findMentionRanges(nextInput, docsList);
                        const stillReferenced = remainingRanges.some(
                          (r) =>
                            (targetRange.materialId && r.materialId === targetRange.materialId) ||
                            r.title.toLowerCase() === targetRange.title.toLowerCase()
                        );

                        if (!stillReferenced) {
                          setAttachedDocs((prev) =>
                            prev.filter(
                              (d) =>
                                (targetRange.materialId ? d.id !== targetRange.materialId : true) &&
                                d.title.toLowerCase() !== targetRange.title.toLowerCase()
                            )
                          );
                        }

                        const newPos = targetRange.start;
                        requestAnimationFrame(() => {
                          if (textareaRef.current) {
                            textareaRef.current.setSelectionRange(newPos, newPos);
                          }
                        });
                        return;
                      }
                    } else {
                      const overlapping = ranges.filter(
                        (r) => selectionStart < r.end && selectionEnd > r.start
                      );
                      if (overlapping.length > 0) {
                        const nextInput = input.slice(0, selectionStart) + input.slice(selectionEnd);
                        const remainingRanges = findMentionRanges(nextInput, docsList);
                        for (const targetRange of overlapping) {
                          const stillReferenced = remainingRanges.some(
                            (r) =>
                              (targetRange.materialId && r.materialId === targetRange.materialId) ||
                              r.title.toLowerCase() === targetRange.title.toLowerCase()
                          );
                          if (!stillReferenced) {
                            setAttachedDocs((prev) =>
                              prev.filter(
                                (d) =>
                                  (targetRange.materialId ? d.id !== targetRange.materialId : true) &&
                                  d.title.toLowerCase() !== targetRange.title.toLowerCase()
                              )
                            );
                          }
                        }
                      }
                    }
                  }

                  // Handle atomic mention deletion with Delete
                  if (e.key === "Delete") {
                    if (selectionStart === selectionEnd) {
                      const pos = selectionStart;
                      const targetRange = ranges.find((r) => pos >= r.start && pos < r.end);
                      if (targetRange) {
                        e.preventDefault();
                        const hasTrailingSpace = input[targetRange.end] === " ";
                        const deleteEnd = hasTrailingSpace ? targetRange.end + 1 : targetRange.end;
                        const nextInput = input.slice(0, targetRange.start) + input.slice(deleteEnd);
                        setInput(nextInput);

                        const remainingRanges = findMentionRanges(nextInput, docsList);
                        const stillReferenced = remainingRanges.some(
                          (r) =>
                            (targetRange.materialId && r.materialId === targetRange.materialId) ||
                            r.title.toLowerCase() === targetRange.title.toLowerCase()
                        );

                        if (!stillReferenced) {
                          setAttachedDocs((prev) =>
                            prev.filter(
                              (d) =>
                                (targetRange.materialId ? d.id !== targetRange.materialId : true) &&
                                d.title.toLowerCase() !== targetRange.title.toLowerCase()
                            )
                          );
                        }

                        const newPos = targetRange.start;
                        requestAnimationFrame(() => {
                          if (textareaRef.current) {
                            textareaRef.current.setSelectionRange(newPos, newPos);
                          }
                        });
                        return;
                      }
                    } else {
                      const overlapping = ranges.filter(
                        (r) => selectionStart < r.end && selectionEnd > r.start
                      );
                      if (overlapping.length > 0) {
                        const nextInput = input.slice(0, selectionStart) + input.slice(selectionEnd);
                        const remainingRanges = findMentionRanges(nextInput, docsList);
                        for (const targetRange of overlapping) {
                          const stillReferenced = remainingRanges.some(
                            (r) =>
                              (targetRange.materialId && r.materialId === targetRange.materialId) ||
                              r.title.toLowerCase() === targetRange.title.toLowerCase()
                          );
                          if (!stillReferenced) {
                            setAttachedDocs((prev) =>
                              prev.filter(
                                (d) =>
                                  (targetRange.materialId ? d.id !== targetRange.materialId : true) &&
                                  d.title.toLowerCase() !== targetRange.title.toLowerCase()
                              )
                            );
                          }
                        }
                      }
                    }
                  }
                }

                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (isListening) stopListening();
                  void submit(input);
                }
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 pt-1">
            {/* Left: Compact Mode Switcher Dropdown */}
            <div className="relative" ref={magIaRef}>
              <button
                type="button"
                onClick={() => {
                  setIsMagIaOpen(!isMagIaOpen);
                  setIsMentionOpen(false);
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

              {/* Pedagogical Mode Popover Menu */}
              {isMagIaOpen && (
                <div
                  className={`absolute bottom-full left-0 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border p-2 shadow-xl z-30 ui-popover-enter backdrop-blur-xl ${
                    isLight
                      ? "bg-white/95 border-slate-200 text-slate-800 shadow-slate-900/10"
                      : "bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/50"
                  }`}
                >
                  {/* Mode Selection Header */}
                  <div className="px-2 pt-1 pb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">tune</span>
                      <span>Modo de Tutoría</span>
                    </span>
                  </div>

                  {/* Mode Selection Cards */}
                  <div className="flex flex-col gap-1">
                    {/* Explicativo Card */}
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

                    {/* Socrático Card */}
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

            {/* Right: Attach File/Img (📎), Mention Docs (@), Voice Mic with Waveform & Send button */}
            <div className="flex items-center gap-1.5">
              {/* Dynamic Live Audio Waveform when listening */}
              {isListening && (
                <div className="flex items-center gap-1 bg-purple-500/15 border border-purple-500/30 rounded-full px-2.5 py-1">
                  <span className="size-2 rounded-full bg-red-500 animate-ping" />
                  <div className="flex items-center gap-0.5 h-4 w-14 justify-center" aria-hidden="true">
                    {audioLevels.map((lvl, idx) => (
                      <span
                        key={idx}
                        className="w-1 bg-gradient-to-t from-indigo-500 to-purple-400 rounded-full transition-all duration-75"
                        style={{ height: `${lvl}%` }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-purple-400 hidden sm:inline">Dictando…</span>
                </div>
              )}

              {/* Attach File or Image Button (📎) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`grid size-8 place-items-center rounded-xl transition ${
                  isLight
                    ? "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
                title="Adjuntar archivo o imagen (PDF, JPG, PNG)"
                aria-label="Adjuntar archivo o imagen"
              >
                <span className="material-symbols-outlined text-[19px]">attach_file</span>
              </button>

              {/* Mention Documents Button (@) */}
              <div className="relative" ref={mentionRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMentionOpen(!isMentionOpen);
                    setIsMagIaOpen(false);
                  }}
                  className={`grid size-8 place-items-center rounded-xl transition ${
                    isMentionOpen
                      ? "bg-purple-600/20 text-[#8b5cf6]"
                      : isLight
                      ? "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                  title="Mencionar documentos de la biblioteca (@)"
                  aria-label="Mencionar documento"
                >
                  <span className="material-symbols-outlined text-[19px]">alternate_email</span>
                </button>

                {/* Mention Picker Dropdown */}
                {isMentionOpen && (
                  <div
                    className={`absolute bottom-full right-0 mb-2 w-72 rounded-2xl border p-2 shadow-2xl z-30 ui-scale-in ${
                      isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-800 text-slate-100"
                    }`}
                  >
                    <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">alternate_email</span>
                      <span>Mencionar documento</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-1 mt-1">
                      {availableMaterials.length === 0 ? (
                        <p className="p-3 text-xs text-slate-500 text-center">No hay documentos subidos aún.</p>
                      ) : (
                        availableMaterials.map((mat) => (
                          <button
                            key={mat.id}
                            type="button"
                            onClick={() => handleSelectMentionDoc(mat)}
                            className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-left transition ${
                              isLight ? "hover:bg-purple-50 text-slate-700" : "hover:bg-purple-950/40 text-slate-200"
                            }`}
                          >
                            <span className="material-symbols-outlined text-red-500 text-base">picture_as_pdf</span>
                            <span className="truncate flex-1 font-medium">{mat.title}</span>
                            {mat.pageCount && (
                              <span className="text-[10px] text-slate-400">{mat.pageCount} pág</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Microphone Button with Real-time Speech Transcription */}
              <button
                type="button"
                onClick={toggleListening}
                className={`grid size-8 place-items-center rounded-xl transition ${
                  isListening
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse"
                    : isLight
                    ? "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
                title={isListening ? "Detener grabación de voz" : "Dictar por voz con transcripción a tiempo real"}
                aria-label="Dictado por voz"
              >
                <span className="material-symbols-outlined text-[19px]">
                  {isListening ? "mic" : "mic"}
                </span>
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={isSending || isTutorWriting || (input.trim().length === 0 && attachedDocs.length === 0)}
                className={`grid size-8 place-items-center rounded-xl transition ${
                  (input.trim().length > 0 || attachedDocs.length > 0) && !isSending && !isTutorWriting
                    ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                    : isLight
                    ? "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                title="Enviar mensaje (Enter)"
                aria-label="Enviar mensaje"
              >
                <span className="material-symbols-outlined text-[17px]">send</span>
              </button>
            </div>
          </div>
        </form>
      </footer>
    </section>
  );
}

function TutorThinkingBubble({
  isLight,
  mode = "explanatory"
}: {
  readonly isLight: boolean;
  readonly mode?: TutorMode | undefined;
}) {
  return (
    <div className="ui-enter flex items-start gap-2.5" aria-label="Proxo está pensando" role="status">
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
