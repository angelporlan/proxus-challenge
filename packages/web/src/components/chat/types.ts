import type { AgentMessage, TutorRecommendation } from "@proxus/shared";

export const MISTAKE_TUTOR_PROMPT_PREFIX = "He fallado esta pregunta y necesito entender el error:";

export type TutorMode = "socratic" | "explanatory";
export type { TutorRecommendation };

export interface ChatProps {
  readonly prefillPrompt?: string | null | undefined;
  readonly autoSubmitPrompt?: string | null | undefined;
  readonly prefillAttachments?: readonly {
    readonly id: string;
    readonly title: string;
    readonly pageCount?: number | undefined;
  }[] | undefined;
  readonly onClearPrefill?: (() => void) | undefined;
  readonly onSelectArtifact?: ((id: string) => void) | undefined;
  readonly theme?: "dark" | "light" | undefined;
  readonly onOpenProfile?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
}

export type ChatItem =
  | { readonly kind: "user"; readonly message: AgentMessage & { readonly role: "user" } }
  | { readonly kind: "tools"; readonly items: readonly AgentMessage[] }
  | {
      readonly kind: "assistant";
      readonly message: AgentMessage & { readonly role: "assistant" };
      readonly associatedTools?: readonly AgentMessage[] | undefined;
      readonly hideArtifactWidgets?: boolean | undefined;
    };

export interface AssistantReveal {
  readonly id: number;
  readonly content: string;
  readonly visibleLength: number;
}

export interface ChatMaterial {
  readonly id: string;
  readonly title: string;
  readonly pageCount?: number | undefined;
}

export const starterPrompts = [
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
    icon: "psychology_alt",
    label: "Rescate de lagunas",
    description: "Genera un ejercicio focalizado en tus fallos pasados para dominarlos",
    prompt: "Revisa las lagunas de conocimiento que tengo registradas en mi perfil, consulta los materiales donde fallé y genera un quiz de refuerzo específico para resolver mis dudas pendientes.",
    setup: "gap-rescue-count" as const,
    mode: undefined as TutorMode | undefined
  },
  {
    icon: "route",
    label: "Plan de estudio inteligente",
    description: "Diagnostica tu temario y crea una ruta de aprendizaje por hitos",
    prompt: "Analiza mis materiales subidos y mis lagunas actuales, y genera una nota de estudio estructurada con un plan de aprendizaje, orden de prioridades y recomendaciones para dominar el temario.",
    mode: undefined as TutorMode | undefined
  }
] as const;
