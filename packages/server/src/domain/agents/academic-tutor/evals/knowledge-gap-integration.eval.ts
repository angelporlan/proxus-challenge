import { Console, Effect, Layer, Ref } from "effect";
import type { KnowledgeGap, KnowledgeProfile } from "@proxus/shared";
import { GeminiModel } from "../../gemini.ts";
import { AgentSession } from "../../harness/index.ts";
import { makeAcademicTutorHarness } from "../../academic-tutor.ts";
import { ArtifactRepository } from "../../../artifacts/artifact.ts";
import { MaterialRepository } from "../../../materials/material.ts";
import { KnowledgeRepository } from "../../../knowledge/knowledge-profile.ts";

const sampleGaps: readonly KnowledgeGap[] = [
  {
    id: "gap-const-art17",
    conceptId: "q-art17",
    topic: "Constitución Española - Art. 17",
    question: "¿Cuál es el plazo máximo ordinario de la detención preventiva antes de ser puesto a disposición judicial o en libertad?",
    studentAnswer: "24 horas",
    correctAnswer: "72 horas",
    explanation: "El artículo 17.2 de la CE establece un plazo máximo de setenta y dos horas para la detención preventiva.",
    status: "active",
    failedAt: new Date().toISOString(),
    sourceArtifactId: "quiz-ce-tema1",
    sourceQuestionId: "q-art17"
  }
];

const makeInMemoryKnowledgeRepo = (initialGaps = sampleGaps) => Effect.gen(function* () {
  const stateRef = yield* Ref.make<KnowledgeProfile>({
    gaps: [...initialGaps],
    totalAttempts: 1
  });

  return KnowledgeRepository.of({
    getProfile: () => Ref.get(stateRef),
    recordGaps: (newGaps) =>
      Ref.updateAndGet(stateRef, (curr) => ({
        ...curr,
        gaps: [...curr.gaps, ...newGaps],
        totalAttempts: curr.totalAttempts + 1
      })),
    updateGapStatus: (id, status) =>
      Effect.gen(function* () {
        const curr = yield* Ref.get(stateRef);
        const index = curr.gaps.findIndex((g: KnowledgeGap) => g.id === id);
        if (index === -1) {
          throw new Error(`Gap not found: ${id}`);
        }
        const updated: KnowledgeGap = { ...curr.gaps[index]!, status };
        const newGaps = [...curr.gaps];
        newGaps[index] = updated;
        yield* Ref.set(stateRef, { ...curr, gaps: newGaps });
        return updated;
      }),
    clearProfile: () => Ref.set(stateRef, { gaps: [], totalAttempts: 0 }),
    listActiveGaps: () =>
      Ref.get(stateRef).pipe(
        Effect.map((p) => p.gaps.filter((g: KnowledgeGap) => g.status === "active" || g.status === "reviewing"))
      )
  });
});

const makeMockMaterialRepo = () => MaterialRepository.of({
  list: () => Effect.succeed([]),
  get: (id) => Effect.die(`Material not found: ${id}`),
  upload: () => Effect.die("Not implemented"),
  delete: () => Effect.void,
  renderPages: () => Effect.die("Not implemented"),
  getFilePath: () => Effect.succeed("/tmp/demo.pdf"),
  searchText: () => Effect.succeed([])
});

const makeMockArtifactRepo = () => ArtifactRepository.of({
  createArtifact: (input) => Effect.succeed({ id: "art-1", ...input }),
  saveArtifact: () => Effect.void,
  getArtifact: () => Effect.die("Not implemented"),
  listArtifacts: () => Effect.succeed([]),
  deleteArtifact: () => Effect.void,
  submitAttempt: () => Effect.die("Not implemented"),
  saveAttempt: () => Effect.void,
  getAttempt: () => Effect.die("Not implemented"),
  listAttempts: () => Effect.succeed([]),
  gradeAttempt: () => Effect.die("Not implemented")
});

export const runKnowledgeGapEval = Effect.gen(function* () {
  yield* Console.log("\n========================================================");
  yield* Console.log(" Running AI Eval: Knowledge Gap Proactive Tutoring");
  yield* Console.log("========================================================\n");

  const knowledgeRepo = yield* makeInMemoryKnowledgeRepo();
  const materialRepo = makeMockMaterialRepo();
  const artifactRepo = makeMockArtifactRepo();

  const activeGaps = yield* knowledgeRepo.listActiveGaps();
  const knowledgeProfileContext = `=== STUDENT KNOWLEDGE GAPS & ACTIVE WEAKNESSES ===\nThe student recently failed the following question(s) in practice quizzes:\n` +
    activeGaps.map((g) => `- [${g.topic}] Question: "${g.question}" (Student Answer: "${g.studentAnswer}", Correct: "${g.correctAnswer}")`).join("\n") +
    `\nWhen the student asks what to review or asks questions, proactively address these weak points.`;

  const harness = makeAcademicTutorHarness(materialRepo, artifactRepo, knowledgeRepo, {
    knowledgeProfileContext
  });
  const session = AgentSession.make(harness);

  const inputPrompt = "Hola tutor, acabo de terminar una sesión de estudio. ¿Qué conceptos o temas me recomiendas repasar hoy?";
  yield* Console.log(`Student Input: "${inputPrompt}"\n`);

  const result = yield* session.run({
    input: inputPrompt,
    maxSteps: 8
  }).pipe(Effect.provide(harness.layer));

  yield* Console.log(`Tutor Response:\n${result.output}\n`);

  // Assertions (Strict AND criteria)
  const lowerOutput = result.output.toLowerCase();
  const identifiesFailedTopic = lowerOutput.includes("constituci") || lowerOutput.includes("17") || lowerOutput.includes("artículo 17");
  const addressesSpecificMisconception = lowerOutput.includes("detenci") || (lowerOutput.includes("72") && lowerOutput.includes("hora")) || lowerOutput.includes("plazo");
  const providesProactiveAction = lowerOutput.includes("repas") || lowerOutput.includes("explic") || lowerOutput.includes("?") || lowerOutput.includes("¿");

  const passed = identifiesFailedTopic && addressesSpecificMisconception && providesProactiveAction;

  yield* Console.log("--- Evaluation Criteria Results ---");
  yield* Console.log(`1. Proactively identified failed topic (Constitución / Art. 17): ${identifiesFailedTopic ? "PASSED" : "FAILED"}`);
  yield* Console.log(`2. Referenced specific failed concept (detención preventiva / 72 horas): ${addressesSpecificMisconception ? "PASSED" : "FAILED"}`);
  yield* Console.log(`3. Offered actionable review or practice: ${providesProactiveAction ? "PASSED" : "FAILED"}`);
  yield* Console.log(`\nFinal Verdict: ${passed ? "✅ ALL EVALUATION CRITERIA PASSED" : "❌ EVALUATION FAILED"}\n`);

  return { passed, output: result.output };
}).pipe(
  Effect.provide(Layer.mergeAll(
    GeminiModel
  ))
);

Effect.runPromise(runKnowledgeGapEval);
