import { Console, Effect, Layer, Ref } from "effect";
import type { KnowledgeGap, KnowledgeProfile } from "@proxus/shared";
import { GeminiModel } from "../../gemini.ts";
import { AgentSession } from "../../harness/index.ts";
import * as AgentCli from "../../harness/index.ts";
import { makeAcademicTutorHarness } from "../../academic-tutor.ts";
import { ArtifactRepository, type CreateArtifactInput } from "../../../artifacts/artifact.ts";
import { MaterialRepository } from "../../../materials/material.ts";
import { KnowledgeRepository } from "../../../knowledge/knowledge-profile.ts";
import { buildKnowledgeGapContext } from "../../../knowledge/gap-context.ts";
import { makeKnowledgeCommands } from "../knowledge-commands.ts";

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
  const stateRef = yield* Ref.make<KnowledgeProfile>({ gaps: [...initialGaps], totalAttempts: 1 });

  return KnowledgeRepository.of({
    getProfile: () => Ref.get(stateRef),
    recordGaps: (newGaps) => Ref.updateAndGet(stateRef, (curr) => ({ ...curr, gaps: [...curr.gaps, ...newGaps] })),
    applyTransitions: (transitions) => Ref.updateAndGet(stateRef, (curr) => {
      const gaps = [...curr.gaps];
      for (const transition of transitions) {
        const index = gaps.findIndex((gap) => gap.id === transition.id);
        if (index === -1) gaps.push(transition);
        else gaps[index] = transition;
      }
      return { ...curr, gaps };
    }),
    updateGapStatus: (id, status) => Effect.gen(function* () {
      const curr = yield* Ref.get(stateRef);
      const index = curr.gaps.findIndex((gap) => gap.id === id);
      if (index === -1) throw new Error(`Gap not found: ${id}`);
      const updated = { ...curr.gaps[index]!, status };
      const gaps = [...curr.gaps];
      gaps[index] = updated;
      yield* Ref.set(stateRef, { ...curr, gaps });
      return updated;
    }),
    removeGapsByArtifactId: (artifactId) => Ref.update(stateRef, (curr) => ({ ...curr, gaps: curr.gaps.filter((gap) => gap.sourceArtifactId !== artifactId) })),
    removeGapsByMaterialId: (materialId) => Ref.update(stateRef, (curr) => ({ ...curr, gaps: curr.gaps.filter((gap) => gap.sourceMaterialId !== materialId) })),
    recordCompletedAttempt: () => Ref.updateAndGet(stateRef, (curr) => ({ ...curr, totalAttempts: curr.totalAttempts + 1, lastAttemptAt: new Date().toISOString() })),
    clearProfile: () => Ref.set(stateRef, { gaps: [], totalAttempts: 0 }),
    listActiveGaps: () => Ref.get(stateRef).pipe(Effect.map((profile) => profile.gaps.filter((gap) => gap.status === "active" || gap.status === "reviewing")))
  });
});

const makeMockMaterialRepo = () => MaterialRepository.of({
  list: () => Effect.succeed([]),
  get: (id) => Effect.die(`Material not found: ${id}`),
  upload: () => Effect.die("Not implemented"),
  delete: () => Effect.void,
  renderPages: () => Effect.die("Not implemented"),
  getFilePath: () => Effect.succeed("/tmp/demo.pdf"),
  searchText: () => Effect.succeed([]),
  getMindMap: () => Effect.succeed(null),
  saveMindMap: () => Effect.void,
  deleteMindMap: () => Effect.void
});

type CreatedExercise = Extract<CreateArtifactInput, { readonly kind: "quiz" | "test" }>;

const makeMockArtifactRepo = (createdArtifacts: CreatedExercise[] = []) => ArtifactRepository.of({
  createArtifact: (input) => Effect.sync(() => {
    if (input.kind === "quiz" || input.kind === "test") createdArtifacts.push(input);
    return { id: "art-1", ...input };
  }),
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

const mentionsFailedConcept = (output: string) => {
  const lowerOutput = output.toLowerCase();
  return (lowerOutput.includes("constituci") || lowerOutput.includes("17") || lowerOutput.includes("artículo 17")) &&
    (lowerOutput.includes("detenci") || (lowerOutput.includes("72") && lowerOutput.includes("hora")) || lowerOutput.includes("plazo"));
};

export const runKnowledgeGapEval = Effect.gen(function* () {
  yield* Console.log("\n========================================================");
  yield* Console.log(" Running AI Eval: Knowledge Gap Closed Loop");
  yield* Console.log("========================================================\n");

  const materialRepo = makeMockMaterialRepo();
  const inputPrompt = "Hola tutor, acabo de terminar una sesión de estudio. ¿Qué conceptos o temas me recomiendas repasar hoy?";
  const knowledgeProfileContext = buildKnowledgeGapContext(sampleGaps).text;

  const runTutor = (prompt: string, context: string, artifactRepo = makeMockArtifactRepo(), initialGaps: readonly KnowledgeGap[] = sampleGaps) => Effect.gen(function* () {
    const knowledgeRepo = yield* makeInMemoryKnowledgeRepo(initialGaps);
    const harness = makeAcademicTutorHarness(materialRepo, artifactRepo, knowledgeRepo, { knowledgeProfileContext: context });
    return yield* AgentSession.make(harness).run({ input: prompt, maxSteps: 8 }).pipe(Effect.provide(harness.layer));
  });

  const withContext = yield* runTutor(inputPrompt, knowledgeProfileContext);
  const withoutContext = yield* runTutor(inputPrompt, "", makeMockArtifactRepo(), []);
  yield* Console.log(`Student Input: "${inputPrompt}"\n`);
  yield* Console.log(`A/B with gap context:\n${withContext.output}\n`);
  yield* Console.log(`A/B without gap context:\n${withoutContext.output}\n`);

  const rescueArtifacts: CreatedExercise[] = [];
  const rescueRepo = makeMockArtifactRepo(rescueArtifacts);
  const rescuePrompt = "Rescata mis lagunas con un quiz de 2 preguntas, una por cada concepto necesario, y enlaza cada pregunta al gap real.";
  const rescueResult = yield* runTutor(rescuePrompt, `${knowledgeProfileContext}\n\nCreate a reinforcement quiz and anchor every question with reinforcesGapId.`, rescueRepo);
  const rescueQuiz = rescueArtifacts.find((artifact) => artifact.kind === "quiz");
  const validGapIds = new Set(sampleGaps.map((gap) => gap.id));
  const anchoringPassed = rescueQuiz !== undefined && rescueQuiz.questions.length > 0 && rescueQuiz.questions.every((question) => question.reinforcesGapId !== undefined && validGapIds.has(question.reinforcesGapId));

  const masterRepo = yield* makeInMemoryKnowledgeRepo();
  const masterOutput = yield* AgentCli.execute([makeKnowledgeCommands(masterRepo)], "knowledge master gap-const-art17");
  const masterRejected = String(masterOutput).includes("mastery is derived from graded attempts");
  const withContextMentionsGap = mentionsFailedConcept(withContext.output);
  const withoutContextOmitsGap = !mentionsFailedConcept(withoutContext.output);
  const providesProactiveAction = /repas|explic|\?|¿/i.test(withContext.output);
  const passed = withContextMentionsGap && withoutContextOmitsGap && providesProactiveAction && anchoringPassed && masterRejected;

  yield* Console.log("--- Evaluation Criteria Results ---");
  yield* Console.log(`1. With-context run identifies the failed concept: ${withContextMentionsGap ? "PASSED" : "FAILED"}`);
  yield* Console.log(`2. Without-context control omits the failed concept: ${withoutContextOmitsGap ? "PASSED" : "FAILED"}`);
  yield* Console.log(`3. With-context run offers an action: ${providesProactiveAction ? "PASSED" : "FAILED"}`);
  yield* Console.log(`4. Rescue questions use valid reinforcesGapId anchors: ${anchoringPassed ? "PASSED" : "FAILED"}`);
  yield* Console.log(`5. knowledge master is rejected: ${masterRejected ? "PASSED" : "FAILED"}`);
  yield* Console.log(`\nFinal Verdict: ${passed ? "✅ ALL EVALUATION CRITERIA PASSED" : "❌ EVALUATION FAILED"}\n`);

  return { passed, output: withContext.output, controlOutput: withoutContext.output, rescueOutput: rescueResult.output };
}).pipe(Effect.provide(Layer.mergeAll(GeminiModel)));

Effect.runPromise(runKnowledgeGapEval);
