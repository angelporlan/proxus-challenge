import type { AgentMessage, ChatSession } from "@proxus/shared";

const STORAGE_KEY = "proxus_chat_sessions";

export function loadSavedSessions(): readonly ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is ChatSession =>
        typeof s === "object" &&
        s !== null &&
        typeof s.id === "string" &&
        typeof s.title === "string" &&
        Array.isArray(s.messages)
    );
  } catch (e) {
    console.error("Error loading chat sessions", e);
    return [];
  }
}

export function saveSessions(sessions: readonly ChatSession[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Error saving chat sessions", e);
  }
}

export function generateSessionTitle(firstMessage: string): string {
  let cleaned = firstMessage
    .replace(/[¿?¡!]/g, "")
    .trim();

  // Strip greeting/command prefixes
  cleaned = cleaned.replace(/^(hola|buenas|oye|por favor)\s*,?\s*/i, "");
  cleaned = cleaned.replace(/^(puedes|podrías|quiero que|hazme|dime|explícame|explicame)\s+/i, "");
  cleaned = cleaned.replace(/^(explicar|explicarme|decirme|crear|hacer)\s+/i, "");
  cleaned = cleaned.trim();
  
  if (!cleaned) return "Nueva conversación";
  const capital = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return capital.length > 38 ? `${capital.slice(0, 35)}…` : capital;
}

export function makeNewSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createOrUpdateSession(
  existingSessions: readonly ChatSession[],
  sessionId: string,
  messages: readonly AgentMessage[],
  mode: "explanatory" | "socratic"
): readonly ChatSession[] {
  if (messages.length === 0) return existingSessions;

  const now = new Date().toISOString();
  const existing = existingSessions.find((s) => s.id === sessionId);

  if (existing) {
    const updated: ChatSession = {
      ...existing,
      messages,
      mode,
      updatedAt: now
    };
    return [updated, ...existingSessions.filter((s) => s.id !== sessionId)];
  }

  // Find first user message for title
  const firstUserMsg = messages.find((m) => m.role === "user");
  const title = firstUserMsg && typeof firstUserMsg.content === "string"
    ? generateSessionTitle(firstUserMsg.content)
    : "Nueva conversación";

  const newSession: ChatSession = {
    id: sessionId,
    title,
    messages,
    mode,
    createdAt: now,
    updatedAt: now
  };

  return [newSession, ...existingSessions];
}

export function deleteStoredSession(
  existingSessions: readonly ChatSession[],
  sessionId: string
): readonly ChatSession[] {
  return existingSessions.filter((s) => s.id !== sessionId);
}

export function clearAllStoredSessions(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Error clearing all sessions", e);
  }
}
