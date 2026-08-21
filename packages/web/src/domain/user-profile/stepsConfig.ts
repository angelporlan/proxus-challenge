export interface StepOption {
  readonly id: string;
  readonly label: string;
  readonly icon?: string | undefined;
}

export type StepType = "chips" | "text" | "chips_with_other" | "text_with_suggestions";

export interface OnboardingStep {
  readonly id: string;
  readonly question: string;
  readonly subtitle?: string | undefined;
  readonly type: StepType;
  readonly profileField: string;
  readonly labelField?: string | undefined;
  readonly required: boolean;
  readonly placeholder?: string | undefined;
  readonly options?: readonly StepOption[] | undefined;
  readonly suggestions?: readonly string[] | undefined;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "step_education_level",
    question: "¿Qué estás estudiando?",
    subtitle: "Adapto el nivel conceptual y profundidad a tu etapa educativa.",
    type: "chips",
    profileField: "educationLevel",
    labelField: "educationLevelLabel",
    required: true,
    options: [
      { id: "university", label: "Universidad", icon: "school" },
      { id: "high_school", label: "Bachillerato", icon: "menu_book" },
      { id: "vocational", label: "Formación Profesional", icon: "engineering" },
      { id: "civil_service", label: "Oposiciones", icon: "gavel" },
      { id: "other", label: "Otro", icon: "more_horiz" }
    ]
  },
  {
    id: "step_study",
    question: "¿Qué estás estudiando exactamente?",
    subtitle: "Para contextualizar ejemplos con tu disciplina o temario.",
    type: "text",
    profileField: "study",
    required: false,
    placeholder: "Por ejemplo: Ingeniería Informática, Derecho, 2º de Bachillerato, oposiciones a Judicatura..."
  },
  {
    id: "step_difficulty",
    question: "¿Qué es lo que más te cuesta cuando estudias?",
    subtitle: "Enfocaré mis explicaciones en superar esta dificultad.",
    type: "chips_with_other",
    profileField: "mainDifficulty",
    labelField: "mainDifficultyLabel",
    required: true,
    options: [
      { id: "understanding_theory", label: "Entender la teoría", icon: "lightbulb" },
      { id: "solving_exercises", label: "Resolver ejercicios", icon: "calculate" },
      { id: "memorizing", label: "Memorizar", icon: "psychology" },
      { id: "concentrating", label: "Concentrarme", icon: "center_focus_strong" },
      { id: "organizing", label: "Organizarme", icon: "calendar_today" },
      { id: "consistency", label: "Mantener la constancia", icon: "trending_up" },
      { id: "other", label: "Otro", icon: "edit_note" }
    ]
  },
  {
    id: "step_blocker",
    question: "¿Qué es lo que más te impide avanzar ahora mismo?",
    subtitle: "Esta respuesta me ayuda a calibrar el ritmo y formato de nuestras sesiones.",
    type: "text_with_suggestions",
    profileField: "mainBlocker",
    required: true,
    placeholder: "Escribe tu mayor obstáculo o elige una sugerencia...",
    suggestions: [
      "Tengo poco tiempo",
      "Me distraigo fácilmente",
      "No sé por dónde empezar",
      "Me bloqueo antes de los exámenes",
      "Me cuesta ser constante"
    ]
  },
  {
    id: "step_help_preference",
    question: "¿Cómo quieres que te ayude cuando no entiendas algo?",
    subtitle: "Así adapto mi forma de intervenir y explicarte los conceptos difíciles.",
    type: "chips",
    profileField: "helpPreference",
    labelField: "helpPreferenceLabel",
    required: true,
    options: [
      { id: "step_by_step", label: "Explícamelo paso a paso", icon: "format_list_numbered" },
      { id: "examples", label: "Ponme un ejemplo", icon: "science" },
      { id: "simple", label: "Explícamelo de forma sencilla", icon: "lightbulb" },
      { id: "guided_questions", label: "Hazme preguntas para que lo descubra", icon: "quiz" },
      { id: "direct", label: "Ve directo al grano", icon: "bolt" },
      { id: "not_sure", label: "No estoy seguro", icon: "help_outline" }
    ]
  }
] as const;
