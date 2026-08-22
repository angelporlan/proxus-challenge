import { Effect, Schema } from "effect";
import { LanguageModel } from "effect/unstable/ai";
import {
  TutorRecommendation,
  type TutorRecommendation as TutorRecommendationType
} from "@proxus/shared";
import type { AgentMessage } from "../harness/index.ts";

export interface TutorRecommendationContext {
  readonly mode: "socratic" | "explanatory" | undefined;
  readonly userInput: string;
  readonly assistantOutput: string;
  readonly recentMessages: readonly AgentMessage[];
  readonly createdArtifact: boolean;
}

const QUIZ_PROMPT = "Genera un quiz de 3 preguntas basado en esta explicación.";
const QUIZ_LABEL = "Comprobar lo aprendido con un quiz de 3 preguntas";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stripJsonFence = (value: string): string => {
  const trimmed = value.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return (fenced?.[1] ?? trimmed).trim();
};

const parseJson = (value: string): unknown => {
  const cleaned = stripJsonFence(value);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return undefined;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return undefined;
    }
  }
};

const normalizeRecommendation = (value: unknown): TutorRecommendationType | undefined => {
  if (!isRecord(value) || (value.kind !== "question" && value.kind !== "quiz")) {
    return undefined;
  }

  if (value.kind === "quiz") {
    return {
      kind: "quiz",
      label: QUIZ_LABEL,
      prompt: QUIZ_PROMPT
    };
  }

  const label = typeof value.label === "string"
    ? value.label.trim().replace(/\s+/g, " ").slice(0, 180)
    : "";
  const prompt = typeof value.prompt === "string"
    ? value.prompt.trim().replace(/\s+/g, " ").slice(0, 500)
    : "";

  if (label.length < 8 || prompt.length < 8) {
    return undefined;
  }

  try {
    return Schema.decodeUnknownSync(TutorRecommendation)({ kind: "question", label, prompt });
  } catch {
    return undefined;
  }
};

export const hasCreatedArtifact = (messages: readonly AgentMessage[]): boolean =>
  messages.some((message) => {
    if (message.role !== "tool-result" || message.isFailure) {
      return false;
    }

    const serialized = typeof message.result === "string"
      ? message.result
      : JSON.stringify(message.result);
    return /"kind"\s*:\s*"(?:note|quiz|test)"/.test(serialized) && /"id"\s*:/.test(serialized);
  });

export const normalizeRecommendations = (
  value: unknown,
  mode: "socratic" | "explanatory" | undefined,
  createdArtifact: boolean
): readonly TutorRecommendationType[] => {
  if (mode === undefined || createdArtifact || !isRecord(value) || !Array.isArray(value.recommendations)) {
    return [];
  }

  const normalized = value.recommendations
    .map(normalizeRecommendation)
    .filter((recommendation): recommendation is TutorRecommendationType => recommendation !== undefined);

  const quiz = normalized.find((recommendation) => recommendation.kind === "quiz");
  if (quiz !== undefined) {
    return [quiz];
  }

  if (mode === "socratic") {
    return [];
  }

  return normalized
    .filter((recommendation): recommendation is Extract<TutorRecommendationType, { readonly kind: "question" }> => recommendation.kind === "question")
    .slice(0, 2);
};

const renderRecentMessages = (messages: readonly AgentMessage[]): string =>
  messages
    .slice(-6)
    .map((message) => {
      switch (message.role) {
        case "user":
          return `Estudiante: ${message.content}`;
        case "assistant":
          return `Proxo: ${message.content}`;
        case "tool-call":
          return `Herramienta usada: ${message.name}`;
        case "tool-result":
          return `Resultado de herramienta: ${message.name}`;
      }
    })
    .join("\n");

const buildPrompt = (context: TutorRecommendationContext): string => [
  "Eres un selector pedagógico para el tutor académico Proxo.",
  "Decide si la respuesta necesita un siguiente paso interactivo para reforzar el aprendizaje.",
  "Devuelve únicamente JSON válido, sin Markdown, con esta forma exacta:",
  '{"recommendations":[{"kind":"question","label":"¿... ?","prompt":"¿... ?"}]}',
  "La lista puede estar vacía.",
  "Tipos permitidos:",
  '- question: una pregunta concreta de recuperación activa que el estudiante pueda contestar ahora.',
  '- quiz: una recomendación para comprobar el bloque completo con un quiz breve de 3 preguntas.',
  "Reglas estrictas:",
  "- Si el modo es explanatory, puedes devolver hasta dos preguntas o un único quiz, nunca ambas cosas.",
  "- Si el modo es socratic, no devuelvas preguntas sugeridas; devuelve un quiz solo si la respuesta cierra un bloque conceptual completo.",
  "- No recomiendes nada para saludos, respuestas breves, aclaraciones puntuales, errores, confirmaciones o respuestas que no enseñen un concepto.",
  "- No recomiendes quiz si ya se ha creado una nota, quiz o simulacro en este turno.",
  "- Solo recomienda quiz cuando la explicación sea suficientemente completa y practicarla aporte valor; no lo conviertas en un CTA rutinario.",
  "- Las preguntas deben ser distintas entre sí, estar en español y poder responderse con el contenido explicado.",
  `Modo actual: ${context.mode ?? "explanatory"}`,
  `Se creó un artefacto en este turno: ${context.createdArtifact ? "sí" : "no"}`,
  `Pregunta del estudiante: ${context.userInput}`,
  `Respuesta final de Proxo:\n${context.assistantOutput}`,
  `Conversación reciente:\n${renderRecentMessages(context.recentMessages)}`
].join("\n");

export const shouldRequestRecommendations = (context: TutorRecommendationContext): boolean =>
  context.mode === "explanatory" &&
  !context.createdArtifact &&
  context.assistantOutput.trim().length >= 80;

export const generateTutorRecommendations = (
  context: TutorRecommendationContext
) => Effect.gen(function* () {
  if (!shouldRequestRecommendations(context)) {
    return [] as readonly TutorRecommendationType[];
  }

  const response = yield* LanguageModel.generateText({ prompt: buildPrompt(context) });
  const parsed = parseJson(response.text);
  return normalizeRecommendations(parsed, context.mode, context.createdArtifact);
}).pipe(
  Effect.catch(() => Effect.succeed([] as readonly TutorRecommendationType[]))
);

export { QUIZ_PROMPT };
