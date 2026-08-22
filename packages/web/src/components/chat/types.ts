import type { AgentMessage } from "@proxus/shared";

export const MISTAKE_TUTOR_PROMPT_PREFIX = "He fallado esta pregunta y necesito entender el error:";

export type TutorMode = "socratic" | "explanatory";

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
  readonly isMaximized?: boolean | undefined;
  readonly onToggleMaximize?: (() => void) | undefined;
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
    icon: "school",
    label: "Tutor Socrático",
    description: "Aprende deduciendo con preguntas guía",
    prompt: "Guíame con preguntas socráticas paso a paso para que razone por mí mismo este tema.",
    mode: "socratic" as TutorMode | undefined
  },
  {
    icon: "schema",
    label: "Esquema conceptual",
    description: "Estructura jerárquica con ideas clave",
    prompt: "Genera un esquema estructurado con las ideas principales y secundarias de este tema.",
    mode: undefined as TutorMode | undefined
  }
] as const;
