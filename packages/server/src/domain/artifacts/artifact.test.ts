import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import {
  type Artifact,
  type QuizArtifact,
  type TestArtifact,
  type UngradedTestAttempt,
  type GradedTestAttempt,
  type UngradedQuizAttempt,
  type GradedQuizAttempt,
  gradeAttempt,
  ArtifactTypeMismatch
} from "./artifact.ts";

describe("artifact grading", () => {
  const quizArtifact: QuizArtifact = {
    kind: "quiz",
    id: "quiz-1",
    title: "Test Quiz",
    questions: [
      {
        type: "multiple-choice",
        id: "q1",
        prompt: "What is 2+2?",
        options: [{ id: "o1", text: "3" }, { id: "o2", text: "4" }],
        correctOptionId: "o2",
        explanation: "Basic math"
      },
      {
        type: "true-false",
        id: "q2",
        prompt: "The sky is blue",
        correctAnswer: true,
        explanation: "Atmosphere scattering"
      }
    ]
  };

  it("grades a quiz with all correct answers", () => {
    const attempt: UngradedQuizAttempt = {
      artifactKind: "quiz",
      status: "ungraded",
      id: "attempt-1",
      artifactId: "quiz-1",
      answers: [
        { questionType: "multiple-choice", questionId: "q1", selectedOptionId: "o2" },
        { questionType: "true-false", questionId: "q2", answer: true }
      ]
    };

    const result = Effect.runSync(gradeAttempt(quizArtifact, attempt)) as GradedQuizAttempt;
    expect(result.status).toBe("graded");
    expect(result.score).toBe(2);
    expect(result.maxScore).toBe(2);
    expect(result.corrections[0]?.correct).toBe(true);
    expect(result.corrections[1]?.correct).toBe(true);
  });

  it("grades a quiz with some wrong answers", () => {
    const attempt: UngradedQuizAttempt = {
      artifactKind: "quiz",
      status: "ungraded",
      id: "attempt-2",
      artifactId: "quiz-1",
      answers: [
        { questionType: "multiple-choice", questionId: "q1", selectedOptionId: "o1" }, // wrong
        { questionType: "true-false", questionId: "q2", answer: true } // correct
      ]
    };

    const result = Effect.runSync(gradeAttempt(quizArtifact, attempt)) as GradedQuizAttempt;
    expect(result.status).toBe("graded");
    expect(result.score).toBe(1);
    expect(result.maxScore).toBe(2);
    expect(result.corrections[0]?.correct).toBe(false);
    expect(result.corrections[1]?.correct).toBe(true);
  });

  it("fails with ArtifactTypeMismatch when artifact types don't match", () => {
    const noteArtifact: Artifact = {
      kind: "note",
      id: "note-1",
      title: "Note",
      markdown: "..."
    };
    
    const attempt: UngradedQuizAttempt = {
      artifactKind: "quiz",
      status: "ungraded",
      id: "attempt-3",
      artifactId: "note-1",
      answers: []
    };

    const result = Effect.runSync(Effect.flip(gradeAttempt(noteArtifact, attempt)));
    expect(result).toBeInstanceOf(ArtifactTypeMismatch);
  });

  it("handles true/false question grading correctly for incorrect answer", () => {
    const attempt: UngradedQuizAttempt = {
      artifactKind: "quiz",
      status: "ungraded",
      id: "attempt-4",
      artifactId: "quiz-1",
      answers: [
        { questionType: "multiple-choice", questionId: "q1", selectedOptionId: "o2" },
        { questionType: "true-false", questionId: "q2", answer: false }
      ]
    };

    const result = Effect.runSync(gradeAttempt(quizArtifact, attempt)) as GradedQuizAttempt;
    expect(result.status).toBe("graded");
    expect(result.score).toBe(1);
    expect(result.corrections[1]?.correct).toBe(false);
  });

  it("grades unanswered questions as incorrect instead of shrinking the exam", () => {
    const testArtifact: TestArtifact = {
      kind: "test",
      id: "test-1",
      title: "Test with unanswered questions",
      questions: [
        quizArtifact.questions[0]!,
        {
          type: "true-false",
          id: "q2",
          prompt: "The sky is blue",
          correctAnswer: true,
          explanation: "Atmosphere scattering"
        },
        {
          type: "short-answer",
          id: "q3",
          prompt: "Name the operation.",
          expectedAnswer: "Addition",
          maxScore: 2
        }
      ]
    };
    const attempt: UngradedTestAttempt = {
      artifactKind: "test",
      status: "ungraded",
      id: "attempt-5",
      artifactId: testArtifact.id,
      answers: [{ questionType: "multiple-choice", questionId: "q1", selectedOptionId: "o2" }]
    };

    const result = Effect.runSync(gradeAttempt(testArtifact, attempt)) as GradedTestAttempt;
    expect(result.score).toBe(1);
    expect(result.maxScore).toBe(4);
    expect(result.corrections).toHaveLength(3);
    const missingTrueFalse = result.corrections[1];
    expect(missingTrueFalse?.questionType).toBe("true-false");
    if (missingTrueFalse?.questionType === "true-false") {
      expect(missingTrueFalse.correct).toBe(false);
    }
    expect(result.corrections[2]?.questionType).toBe("short-answer");
  });
});
