import type { AgentMessage } from "@proxus/shared";
import type { ChatItem } from "./types.ts";

export function groupChatItems(messages: readonly AgentMessage[]): readonly ChatItem[] {
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

  for (const msg of messages) {
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
}

export function extractArtifactIds(
  content: string,
  associatedTools?: readonly AgentMessage[]
): readonly string[] {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const textMatches = content.match(uuidRegex) ?? [];
  const toolMatches: string[] = [];
  if (associatedTools) {
    for (const tool of associatedTools) {
      try {
        const matches = JSON.stringify(tool).match(uuidRegex);
        if (matches) toolMatches.push(...matches);
      } catch {
        // ignore serialization failures on malformed tool payloads
      }
    }
  }
  return Array.from(new Set([...textMatches, ...toolMatches]));
}

export function conversationHasNoteArtifact(messages: readonly AgentMessage[]): boolean {
  return messages.some(
    (message) =>
      (message.role === "tool-result" &&
        typeof message.result === "object" &&
        message.result !== null &&
        "kind" in message.result &&
        (message.result as { kind?: unknown }).kind === "note") ||
      (message.role === "tool-call" &&
        typeof message.input === "object" &&
        message.input !== null &&
        JSON.stringify(message.input).includes('"kind":"note"'))
  );
}
