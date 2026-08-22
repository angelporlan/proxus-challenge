export type GapRescueQuestionCount = 3 | 6 | 10;

export const GAP_RESCUE_MAX_QUESTIONS = 10;

export const GAP_RESCUE_QUESTION_COUNTS = [
  { value: 3, label: "3", hint: "Rápido" },
  { value: 6, label: "6", hint: "Estándar" },
  { value: 10, label: "10", hint: "Completo" }
] as const satisfies readonly {
  readonly value: GapRescueQuestionCount;
  readonly label: string;
  readonly hint: string;
}[];

const GAP_RESCUE_BASE =
  "Revisa las lagunas de conocimiento que tengo registradas en mi perfil, consulta los materiales donde fallé y genera un único quiz de refuerzo específico para resolver mis dudas pendientes.";

export const buildGapRescuePrompt = (count: GapRescueQuestionCount): string => [
  GAP_RESCUE_BASE,
  `Crea exactamente ${count} preguntas. Nunca más de ${GAP_RESCUE_MAX_QUESTIONS}.`,
  "Prioriza las lagunas más críticas. Si hay menos lagunas que preguntas, cubre las mismas con varios ángulos; si hay más, elige las más importantes.",
  "No copies las preguntas falladas literalmente."
].join(" ");

export const buildGapRescueDisplay = (count: GapRescueQuestionCount): string =>
  `Rescate de lagunas · ${count} preguntas`;
