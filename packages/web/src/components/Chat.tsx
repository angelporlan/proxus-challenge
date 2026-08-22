import { useAtomValue } from "@effect/atom-react";
import type { ChatSession } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { materialsQuery } from "../domain/materials/atoms.ts";
import { groupChatItems } from "./chat/group-chat-items.ts";
import { ChatComposer } from "./chat/ChatComposer.tsx";
import { ChatHeader } from "./chat/ChatHeader.tsx";
import { ChatMessageList } from "./chat/ChatMessageList.tsx";
import type { ChatProps } from "./chat/types.ts";
import { useChatPdfUpload } from "../hooks/useChatPdfUpload.ts";
import { useChatSessions } from "../hooks/useChatSessions.ts";
import { useMentions, type AttachedDoc } from "../hooks/useMentions.ts";
import { useTutorTurn } from "../hooks/useTutorTurn.ts";
import { useVoiceDictation } from "../hooks/useVoiceDictation.ts";

export {
  findMentionRanges,
  splitMentionParts,
  useMentions,
  type MentionRange,
  type MentionPart
} from "../hooks/useMentions.ts";
export type { ChatProps, TutorMode } from "./chat/types.ts";

export function Chat({
  prefillPrompt,
  autoSubmitPrompt,
  prefillAttachments,
  onClearPrefill,
  onSelectArtifact,
  onOpenMindMap,
  theme = "dark",
  isMaximized = false,
  onToggleMaximize
}: ChatProps = {}) {
  const isLight = theme === "light";
  const [input, setInput] = useState("");
  const [attachedDocs, setAttachedDocs] = useState<AttachedDoc[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMagIaOpen, setIsMagIaOpen] = useState(false);

  const historyMenuRef = useRef<HTMLDivElement>(null);
  const magIaRef = useRef<HTMLDivElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const consumedAutoSubmitPromptRef = useRef<string | null>(null);

  const {
    sessions,
    currentSessionId,
    messages,
    setMessages,
    tutorMode,
    setTutorMode,
    abortControllerRef,
    handleNewChat: startNewChat,
    handleSelectSession: restoreSession,
    handleDeleteSession: handleDeleteStoredSession
  } = useChatSessions();

  const { isSending, isTutorWriting, assistantReveal, error, setError, submit, clearReveal } = useTutorTurn({
    messages,
    setMessages,
    tutorMode,
    attachedDocs,
    setAttachedDocs,
    setInput,
    abortControllerRef,
    messagesEndRef
  });

  const { isUploading, handleDirectFileUpload } = useChatPdfUpload({
    setAttachedDocs,
    setError
  });

  const materialsResult = useAtomValue(materialsQuery);
  const availableMaterials = AsyncResult.match(materialsResult, {
    onInitial: () => [],
    onFailure: () => [],
    onSuccess: ({ value }) => value.materials
  });

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

  const handleNewChat = () => {
    startNewChat();
    clearReveal();
    setIsHistoryOpen(false);
  };

  const handleSelectSession = (session: ChatSession) => {
    restoreSession(session);
    clearReveal();
    setIsHistoryOpen(false);
  };

  const handleDeleteSession = (sessionId: string, event: React.MouseEvent) => {
    if (currentSessionId === sessionId) {
      clearReveal();
    }
    handleDeleteStoredSession(sessionId, event);
  };

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

  useEffect(() => {
    if (!autoSubmitPrompt) {
      consumedAutoSubmitPromptRef.current = null;
    }
    if (!prefillPrompt || isSending || isTutorWriting || (autoSubmitPrompt && consumedAutoSubmitPromptRef.current === autoSubmitPrompt)) return;

    const mergedAttachments: AttachedDoc[] = [...attachedDocs];
    for (const att of prefillAttachments ?? []) {
      if (!mergedAttachments.some((doc) => doc.id === att.id)) {
        mergedAttachments.push(att);
      }
    }

    if (autoSubmitPrompt) {
      consumedAutoSubmitPromptRef.current = autoSubmitPrompt;
      onClearPrefill?.();
      void submit(autoSubmitPrompt, prefillPrompt, mergedAttachments);
      return;
    }

    setInput(prefillPrompt);
    setAttachedDocs(mergedAttachments);
    onClearPrefill?.();
  }, [autoSubmitPrompt, isSending, isTutorWriting, onClearPrefill, prefillAttachments, prefillPrompt]);

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
