import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { AgentMessage, ChatSession } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useVoiceDictation } from "../hooks/useVoiceDictation.ts";
export {
  findMentionRanges,
  splitMentionParts,
  useMentions,
  type MentionRange,
  type MentionPart
} from "../hooks/useMentions.ts";
import { useMentions, type AttachedDoc } from "../hooks/useMentions.ts";
import { ChatComposer } from "./chat/ChatComposer.tsx";
import { ChatHeader } from "./chat/ChatHeader.tsx";
import { ChatMessageList } from "./chat/ChatMessageList.tsx";
import { groupChatItems } from "./chat/group-chat-items.ts";
import type { AssistantReveal, ChatProps, TutorMode } from "./chat/types.ts";

export type { ChatProps, TutorMode } from "./chat/types.ts";

export function Chat({
  prefillPrompt,
  prefillAttachments,
  onClearPrefill,
  onSelectArtifact,
  onOpenMindMap,
  theme = "dark",
  isMaximized = false,
  onToggleMaximize
}: ChatProps = {}) {
  const isLight = theme === "light";
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

  const [attachedDocs, setAttachedDocs] = useState<AttachedDoc[]>([]);
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

  const { isListening, audioLevels, toggleListening, stopListening } = useVoiceDictation((text) =>
    setInput(text)
  );

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
  } = useMentions(input, setInput, attachedDocs, setAttachedDocs, availableMaterials, textareaRef);

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

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    []
  );

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

  const groupedItems = useMemo(() => groupChatItems(messages), [messages]);

  return (
    <section
      aria-label="Tutor de estudio"
      className={`grid h-full min-h-0 max-h-full min-w-0 grid-rows-[auto_1fr_auto] flex-1 transition-colors ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-[#090d16] text-slate-100"
      }`}
    >
      <ChatHeader
        isLight={isLight}
        isMaximized={isMaximized}
        isHistoryOpen={isHistoryOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        historyMenuRef={historyMenuRef}
        onNewChat={handleNewChat}
        onToggleHistory={() => setIsHistoryOpen((v) => !v)}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onToggleMaximize={onToggleMaximize}
      />

      <ChatMessageList
        groupedItems={groupedItems}
        messages={messages}
        availableMaterials={availableMaterials}
        isSending={isSending}
        isTutorWriting={isTutorWriting}
        assistantReveal={assistantReveal}
        tutorMode={tutorMode}
        isLight={isLight}
        messagesEndRef={messagesEndRef}
        onSubmit={(prompt) => void submit(prompt)}
        onSetTutorMode={setTutorMode}
        onSelectArtifact={onSelectArtifact}
        onOpenMindMap={onOpenMindMap}
      />

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

      <ChatComposer
        isLight={isLight}
        input={input}
        setInput={setInput}
        tutorMode={tutorMode}
        setTutorMode={setTutorMode}
        attachedDocs={attachedDocs}
        setAttachedDocs={setAttachedDocs}
        availableMaterials={availableMaterials}
        isSending={isSending}
        isTutorWriting={isTutorWriting}
        isUploading={isUploading}
        isListening={isListening}
        audioLevels={audioLevels}
        isMentionOpen={isMentionOpen}
        setIsMentionOpen={setIsMentionOpen}
        mentionQuery={mentionQuery}
        setMentionQuery={setMentionQuery}
        selectedMentionIndex={selectedMentionIndex}
        setSelectedMentionIndex={setSelectedMentionIndex}
        filteredMentionMaterials={filteredMentionMaterials}
        handleSelectMentionDoc={handleSelectMentionDoc}
        handleRemoveAttachedDoc={handleRemoveAttachedDoc}
        magIaRef={magIaRef}
        mentionRef={mentionRef}
        backdropRef={backdropRef}
        textareaRef={textareaRef}
        fileInputRef={fileInputRef}
        isMagIaOpen={isMagIaOpen}
        setIsMagIaOpen={setIsMagIaOpen}
        onSubmit={(prompt) => void submit(prompt)}
        onFileChange={(event) => void handleDirectFileUpload(event)}
        toggleListening={toggleListening}
        stopListening={stopListening}
      />
    </section>
  );
}
