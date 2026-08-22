import { describe, expect, it } from "vitest";
import {
  hasCreatedArtifact,
  normalizeRecommendations
} from "./recommendation-service.ts";

describe("tutor recommendations", () => {
  it("keeps at most two explanatory questions", () => {
    const recommendations = normalizeRecommendations({
      recommendations: [
        { kind: "question", label: "¿Qué significa X?", prompt: "¿Qué significa X?" },
        { kind: "question", label: "¿Cómo se aplica X?", prompt: "¿Cómo se aplica X?" },
        { kind: "question", label: "¿Por qué importa X?", prompt: "¿Por qué importa X?" }
      ]
    }, "explanatory", false);

    expect(recommendations).toHaveLength(2);
    expect(recommendations.every((recommendation) => recommendation.kind === "question")).toBe(true);
  });

  it("prioritizes one quiz and always fixes it to three questions", () => {
    const recommendations = normalizeRecommendations({
      recommendations: [
        { kind: "question", label: "¿Qué recuerdas?", prompt: "¿Qué recuerdas?" },
        { kind: "quiz", label: "Quiz de 5 preguntas", prompt: "Genera un quiz de 5 preguntas." }
      ]
    }, "explanatory", false);

    expect(recommendations).toEqual([{
      kind: "quiz",
      label: "Comprobar lo aprendido con un quiz de 3 preguntas",
      prompt: "Genera un quiz de 3 preguntas basado en esta explicación."
    }]);
  });

  it("does not suggest questions in socratic mode", () => {
    const recommendations = normalizeRecommendations({
      recommendations: [
        { kind: "question", label: "¿Qué recuerdas?", prompt: "¿Qué recuerdas?" }
      ]
    }, "socratic", false);

    expect(recommendations).toEqual([]);
  });

  it("does not add recommendations after an artifact was created", () => {
    const recommendations = normalizeRecommendations({
      recommendations: [{ kind: "quiz", label: "Quiz", prompt: "Crea un quiz" }]
    }, "explanatory", true);

    expect(recommendations).toEqual([]);
  });

  it("detects artifacts in successful CLI results", () => {
    expect(hasCreatedArtifact([
      { role: "tool-result", name: "cli", result: { kind: "quiz", id: "quiz-1" }, isFailure: false }
    ])).toBe(true);
    expect(hasCreatedArtifact([
      { role: "tool-result", name: "cli", result: "Invalid artifact JSON", isFailure: false }
    ])).toBe(false);
  });
});
