import type { AgentMessage, ChatSession } from "@proxus/shared";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  createOrUpdateSession,
  deleteStoredSession,
  loadSavedSessions,
  makeNewSessionId,
  saveSessions
} from "../domain/sessions/storage.ts";
import type { TutorMode } from "../components/chat/types.ts";

export function useChatSessions() {
  const [sessions, setSessions] = useState<readonly ChatSession[]>(() => loadSavedSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const saved = loadSavedSessions();
    return saved[0]?.id ?? makeNewSessionId();
  });
  const [messages, setMessages] = useState<readonly AgentMessage[]>(() => {
    const saved = loadSavedSessions();
    return saved[0]?.messages ?? [];
  });
  const [tutorMode, setTutorMode] = useState<TutorMode>(() => {
    const saved = loadSavedSessions();
    return saved[0]?.mode ?? "explanatory";
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setSessions((prev) => {
        const next = createOrUpdateSession(prev, currentSessionId, messages, tutorMode);
        saveSessions(next);
        return next;
      });
    }
  }, [messages, currentSessionId, tutorMode]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    []
  );

  const abortActiveTurn = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const handleNewChat = useCallback(() => {
    abortActiveTurn();
    setCurrentSessionId(makeNewSessionId());
    setMessages([]);
  }, [abortActiveTurn]);

  const handleSelectSession = useCallback((session: ChatSession) => {
    abortActiveTurn();
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    if (session.mode) {
      setTutorMode(session.mode);
    }
  }, [abortActiveTurn]);

  const handleDeleteSession = useCallback((sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSessions((prev) => {
      const next = deleteStoredSession(prev, sessionId);
      saveSessions(next);
      return next;
    });
    setCurrentSessionId((curr) => {
      if (curr === sessionId) {
        setMessages([]);
        return makeNewSessionId();
      }
      return curr;
    });
  }, []);

  return {
    sessions,
    currentSessionId,
    messages,
    setMessages,
    tutorMode,
    setTutorMode,
    abortControllerRef,
    abortActiveTurn,
    handleNewChat,
    handleSelectSession,
    handleDeleteSession
  };
}
