import { describe, expect, it, beforeEach } from "vitest";
import {
  loadSavedSessions,
  saveSessions,
  generateSessionTitle,
  createOrUpdateSession,
  deleteStoredSession,
  clearAllStoredSessions,
  makeNewSessionId
} from "./storage.ts";
import type { AgentMessage, ChatSession } from "@proxus/shared";

describe("Chat Sessions Storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("generates human-readable titles from user prompts", () => {
    expect(generateSessionTitle("¿Puedes explicarme las leyes de Kepler?")).toBe("Las leyes de Kepler");
    expect(generateSessionTitle("hola, qué es la fotosíntesis?")).toBe("Qué es la fotosíntesis");
    expect(generateSessionTitle("hazme un quiz de filosofía")).toBe("Un quiz de filosofía");
    expect(generateSessionTitle("   ")).toBe("Nueva conversación");
  });

  it("creates and updates sessions in state and storage", () => {
    const sessionId = makeNewSessionId();
    const messages: AgentMessage[] = [
      { role: "user", content: "Explícame la ley de gravitación universal" },
      { role: "assistant", content: "La ley de gravitación universal establece..." }
    ];

    const initialSessions: readonly ChatSession[] = [];
    const updatedSessions = createOrUpdateSession(initialSessions, sessionId, messages, "explanatory");

    expect(updatedSessions).toHaveLength(1);
    expect(updatedSessions[0]!.id).toBe(sessionId);
    expect(updatedSessions[0]!.title).toContain("La ley de gravitación universal");
    expect(updatedSessions[0]!.mode).toBe("explanatory");
    expect(updatedSessions[0]!.messages).toHaveLength(2);

    saveSessions(updatedSessions);
    const loaded = loadSavedSessions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.id).toBe(sessionId);
  });

  it("deletes a session correctly", () => {
    const id1 = makeNewSessionId();
    const id2 = makeNewSessionId();
    const sessions: ChatSession[] = [
      {
        id: id1,
        title: "Sesión 1",
        messages: [{ role: "user", content: "Hola" }],
        mode: "explanatory",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: id2,
        title: "Sesión 2",
        messages: [{ role: "user", content: "Mundo" }],
        mode: "socratic",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const remaining = deleteStoredSession(sessions, id1);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(id2);
  });

  it("clears all stored sessions", () => {
    saveSessions([
      {
        id: "sess_1",
        title: "Test",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
    expect(loadSavedSessions()).toHaveLength(1);

    clearAllStoredSessions();
    expect(loadSavedSessions()).toHaveLength(0);
  });
});
