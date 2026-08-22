import type { AgentMessage } from "@proxus/shared";
import { MISTAKE_TUTOR_PROMPT_PREFIX, type ChatItem } from "./types.ts";

export function groupChatItems(messages: readonly AgentMessage[]): readonly ChatItem[] {
  const items: ChatItem[] = [];
  let currentTools: AgentMessage[] = [];
  let hideArtifactWidgetsForNextAssistant = false;

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
      hideArtifactWidgetsForNextAssistant = msg.content.trimStart().startsWith(MISTAKE_TUTOR_PROMPT_PREFIX);
      items.push({ kind: "user", message: msg as AgentMessage & { role: "user" } });
    } else if (msg.role === "tool-call" || msg.role === "tool-result") {
      currentTools.push(msg);
    } else if (msg.role === "assistant") {
      const toolsForTurn = [...currentTools];
      flushTools();
      items.push({
        kind: "assistant",
        message: msg as AgentMessage & { role: "assistant" },
        associatedTools: toolsForTurn,
        hideArtifactWidgets: hideArtifactWidgetsForNextAssistant
      });
    }
  }
  flushTools();

  return items;
}

const ARTIFACT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ARTIFACT_KINDS = new Set(["note", "quiz", "test"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cliCommand = (input: unknown): string | undefined => {
  if (!isRecord(input)) {
    return undefined;
  }
  return typeof input.input === "string" ? input.input.trim() : undefined;
};

const isArtifactsCreateCall = (message: AgentMessage): boolean => {
  if (message.role !== "tool-call" || message.name !== "cli") {
    return false;
  }

  const command = cliCommand(message.input);
  if (command?.startsWith("artifacts create")) {
    return true;
  }

  return isRecord(message.input) && typeof message.input.kind === "string" && ARTIFACT_KINDS.has(message.input.kind);
};

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const parseCreatedArtifactId = (result: unknown): string | undefined => {
  const value = typeof result === "string" ? parseJson(result) : result;
  if (!isRecord(value) || typeof value.id !== "string" || !ARTIFACT_ID_RE.test(value.id)) {
    return undefined;
  }
  if (typeof value.kind !== "string" || !ARTIFACT_KINDS.has(value.kind)) {
    return undefined;
  }
  return value.id;
};

/**
 * Widgets should only render artifacts created in this turn.
 * Scanning every UUID in tool payloads also matched `gap-<quiz-uuid>-q1`
 * from `knowledge gaps` and listed every previous quiz.
 */
export function extractArtifactIds(
  _content: string,
  associatedTools?: readonly AgentMessage[]
): readonly string[] {
  if (!associatedTools || associatedTools.length === 0) {
    return [];
  }

  const ids: string[] = [];
  let index = 0;

  while (index < associatedTools.length) {
    const calls: AgentMessage[] = [];
    while (index < associatedTools.length && associatedTools[index]?.role === "tool-call") {
      calls.push(associatedTools[index]!);
      index += 1;
    }

    const results: AgentMessage[] = [];
    while (index < associatedTools.length && associatedTools[index]?.role === "tool-result") {
      results.push(associatedTools[index]!);
      index += 1;
    }

    const paired = Math.min(calls.length, results.length);
    for (let pairIndex = 0; pairIndex < paired; pairIndex += 1) {
      const call = calls[pairIndex]!;
      const result = results[pairIndex]!;
      if (result.role !== "tool-result" || result.isFailure || !isArtifactsCreateCall(call)) {
        continue;
      }
      const createdId = parseCreatedArtifactId(result.result);
      if (createdId !== undefined) {
        ids.push(createdId);
      }
    }
  }

  return Array.from(new Set(ids));
}
