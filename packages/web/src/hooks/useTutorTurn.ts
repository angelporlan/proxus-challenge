import type { AgentMessage, TutorRecommendation } from "@proxus/shared";
import { useAtomRefresh } from "@effect/atom-react";
import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { knowledgeProfileQuery } from "../domain/knowledge/atoms.ts";
import { materialsQuery } from "../domain/materials/atoms.ts";
import { applyInvalidations, invalidationsForToolCall } from "../domain/tutor/invalidation.ts";
import { streamTutorMessage } from "../domain/tutor/stream.ts";
import type { AssistantReveal, TutorMode } from "../components/chat/types.ts";
import type { AttachedDoc } from "./useMentions.ts";

export function useTutorTurn({
  messages,
  setMessages,
  tutorMode,
  attachedDocs,
  setAttachedDocs,
  setInput,
  abortControllerRef,
  messagesEndRef
}: {
  readonly messages: readonly AgentMessage[];
  readonly setMessages: Dispatch<SetStateAction<readonly AgentMessage[]>>;
  readonly tutorMode: TutorMode;
  readonly attachedDocs: readonly AttachedDoc[];
  readonly setAttachedDocs: Dispatch<SetStateAction<AttachedDoc[]>>;
  readonly setInput: Dispatch<SetStateAction<string>>;
  readonly abortControllerRef: RefObject<AbortController | null>;
  readonly messagesEndRef: RefObject<HTMLDivElement | null>;
}) {
  const [isSending, setIsSending] = useState(false);
  const [assistantReveal, setAssistantReveal] = useState<AssistantReveal | null>(null);
  const [recommendations, setRecommendations] = useState<readonly TutorRecommendation[]>([]);
  const [error, setError] = useState<string | undefined>();
  const assistantRevealIdRef = useRef(0);
  const pendingInvalidations = useRef<Array<ReturnType<typeof invalidationsForToolCall>>>([]);
  const quizCooldownRef = useRef(0);

  const refreshArtifacts = useAtomRefresh(artifactsQuery);
  const refreshMaterials = useAtomRefresh(materialsQuery);
  const refreshKnowledge = useAtomRefresh(knowledgeProfileQuery);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages, isSending, assistantReveal?.visibleLength, messagesEndRef]);

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

  const isTutorWriting = assistantReveal !== null;

  const clearReveal = () => setAssistantReveal(null);
  const clearRecommendations = () => {
    setRecommendations([]);
    quizCooldownRef.current = 0;
  };

  const submit = async (
    nextInput: string,
    displayInput = nextInput,
    attachedDocsOverride?: readonly AttachedDoc[]
  ) => {
    const trimmed = nextInput.trim();
    const activeAttachedDocs = attachedDocsOverride ?? attachedDocs;
    if ((trimmed.length === 0 && activeAttachedDocs.length === 0) || isSending || isTutorWriting) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (quizCooldownRef.current > 0) {
      quizCooldownRef.current -= 1;
    }

    const finalPrompt = trimmed || "Explícame los conceptos clave de este documento.";
    const activeMaterialIds = activeAttachedDocs.map((d) => d.id);
    const documentReferences = activeAttachedDocs.map((d) => d.title);
    const optimisticUserMessage: AgentMessage = { role: "user", content: displayInput.trim() || finalPrompt };

    setAttachedDocs([]);
    setInput("");
    setMessages((current) => [...current, optimisticUserMessage]);
    setRecommendations([]);
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

        if (event.type === "recommendations") {
          const visibleRecommendations = event.recommendations
            .filter((recommendation) => tutorMode !== "socratic" || recommendation.kind === "quiz")
            .filter((recommendation) => quizCooldownRef.current === 0 || recommendation.kind !== "quiz")
            .filter((recommendation, index, all) => index === all.findIndex((candidate) =>
              candidate.kind === recommendation.kind && candidate.prompt === recommendation.prompt
            ))
            .slice(0, 2);

          if (visibleRecommendations.some((recommendation) => recommendation.kind === "quiz")) {
            quizCooldownRef.current = 3;
          }
          setRecommendations(visibleRecommendations);
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
      setError(
        err instanceof Error && err.message.trim().length > 0
          ? err.message
          : "No se pudo completar la respuesta. Comprueba la conexión e inténtalo de nuevo."
      );
    } finally {
      setIsSending(false);
    }
  };

  return {
    isSending,
    isTutorWriting,
    assistantReveal,
    error,
    setError,
    submit,
    clearReveal,
    recommendations,
    clearRecommendations
  };
}
