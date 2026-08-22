import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { AsyncResult } from "effect/unstable/reactivity";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtifactAttempt, QuizArtifact } from "@proxus/shared";

const mocks = vi.hoisted(() => ({
  artifactResults: new Map<string, unknown>(),
  submitAttempt: vi.fn()
}));

vi.mock("@effect/atom-react", () => ({
  useAtomRefresh: () => vi.fn(),
  useAtomSet: () => mocks.submitAttempt,
  useAtomValue: (query: { readonly id: string }) => mocks.artifactResults.get(query.id)
}));

vi.mock("../domain/artifacts/atoms.ts", () => ({
  artifactQuery: (id: string) => ({ id }),
  submitArtifactAttemptAction: {}
}));

import { ArtifactWorkspace } from "./ArtifactWorkspace.tsx";

const makeQuiz = (id: string, prompt: string, firstOptionText: string, secondOptionText: string): QuizArtifact => ({
  kind: "quiz",
  id,
  title: id,
  questions: [{
    type: "multiple-choice",
    id: "q1",
    prompt,
    options: [
      { id: "a", text: firstOptionText },
      { id: "b", text: secondOptionText }
    ],
    correctOptionId: "b",
    explanation: "Explicación propia de este quiz"
  }]
});

describe("ArtifactWorkspace", () => {
  beforeEach(() => {
    mocks.artifactResults.clear();
    mocks.submitAttempt.mockReset();
    if (typeof HTMLElement.prototype.scrollIntoView !== "function") {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: vi.fn()
      });
    }
  });

  it("reinicia respuestas y correcciones al cambiar de quiz", async () => {
    const user = userEvent.setup();
    const firstQuiz = makeQuiz("quiz-1", "Pregunta del primer quiz", "Primera A", "Primera B");
    const secondQuiz = makeQuiz("quiz-2", "Pregunta del segundo quiz", "Segunda A", "Segunda B");
    const gradedAttempt: ArtifactAttempt = {
      artifactKind: "quiz",
      status: "graded",
      id: "attempt-1",
      artifactId: firstQuiz.id,
      answers: [{ questionType: "multiple-choice", questionId: "q1", selectedOptionId: "a" }],
      score: 0,
      maxScore: 1,
      summary: "0/1 correct",
      corrections: [{
        questionType: "multiple-choice",
        questionId: "q1",
        correct: false,
        selectedOptionId: "a",
        correctOptionId: "b",
        explanation: "Explicación propia del primer quiz"
      }]
    };

    mocks.artifactResults.set(firstQuiz.id, AsyncResult.success(firstQuiz));
    mocks.artifactResults.set(secondQuiz.id, AsyncResult.success(secondQuiz));
    mocks.submitAttempt.mockResolvedValueOnce(gradedAttempt);

    const { rerender } = render(<ArtifactWorkspace artifactId={firstQuiz.id} />);

    await user.click(await screen.findByText("Primera A"));

    expect(await screen.findByText("Respuesta correcta:")).toBeInTheDocument();
    expect(screen.getByDisplayValue("a")).toBeChecked();
    expect(await screen.findByText(/Quiz completado/i)).toBeInTheDocument();

    rerender(<ArtifactWorkspace artifactId={secondQuiz.id} />);

    expect(await screen.findByText("Pregunta del segundo quiz")).toBeInTheDocument();
    expect(screen.getByDisplayValue("a")).not.toBeChecked();
    expect(screen.queryByText("Explicación propia del primer quiz")).not.toBeInTheDocument();
  });

  it("centra la pregunta después de responderla para mantener visible el feedback", async () => {
    const user = userEvent.setup();
    const quiz: QuizArtifact = {
      kind: "quiz",
      id: "quiz-scroll",
      title: "Quiz con scroll",
      questions: [
        {
          type: "multiple-choice",
          id: "q1",
          prompt: "Pregunta que se responde",
          options: [{ id: "a", text: "Primera opción" }, { id: "b", text: "Segunda opción" }],
          correctOptionId: "b",
          explanation: "Explicación"
        },
        {
          type: "true-false",
          id: "q2",
          prompt: "Pregunta siguiente",
          correctAnswer: true,
          explanation: "Explicación siguiente"
        }
      ]
    };

    mocks.artifactResults.set(quiz.id, AsyncResult.success(quiz));
    mocks.submitAttempt.mockResolvedValue({});

    render(<ArtifactWorkspace artifactId={quiz.id} />);
    await user.click(screen.getByText("Primera opción"));

    await vi.waitFor(() => {
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
      });
    });
  });
});
