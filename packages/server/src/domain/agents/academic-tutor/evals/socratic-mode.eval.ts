import { Console, Effect, Layer } from "effect";
import { GeminiModel } from "../../gemini.ts";
import { AgentSession } from "../../harness/index.ts";
import { makeAcademicTutorHarness } from "../../academic-tutor.ts";
import { ArtifactRepository } from "../../../artifacts/artifact.ts";
import { MaterialRepository } from "../../../materials/material.ts";

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

export const runSocraticModeEval = Effect.gen(function* () {
  yield* Console.log("\n========================================================");
  yield* Console.log(" Running AI Eval: Socratic Tutoring Adherence");
  yield* Console.log("========================================================\n");

  const harness = makeAcademicTutorHarness(makeMockMaterialRepo(), makeMockArtifactRepo(), undefined, {
    mode: "socratic"
  });
  const session = AgentSession.make(harness);

  const inputPrompt = "¿Cuántas horas puede durar como máximo la detención preventiva según la Constitución Española?";
  yield* Console.log(`Student Input: "${inputPrompt}"\nMode: Socratic\n`);

  const result = yield* session.run({
    input: inputPrompt,
    maxSteps: 8
  }).pipe(Effect.provide(harness.layer));

  yield* Console.log(`Tutor Response:\n${result.output}\n`);

  const containsQuestions = result.output.includes("?") || result.output.includes("¿");
  const revealsDirectAnswer = /\b(72\s*(horas|h)?|setenta\s*y\s*dos)\b/i.test(result.output);
  const guidesCognitively = /libertad|detenci|juez|judicial|plazo|constituci|derecho/i.test(result.output);
  const passed = containsQuestions && !revealsDirectAnswer && guidesCognitively;

  yield* Console.log("--- Evaluation Criteria Results ---");
  yield* Console.log(`1. Formulates guiding question(s) (contains '?'): ${containsQuestions ? "PASSED" : "FAILED"}`);
  yield* Console.log(`2. Does NOT reveal direct answer (72 horas / setenta y dos): ${!revealsDirectAnswer ? "PASSED" : "FAILED"}`);
  yield* Console.log(`3. Provides cognitive/contextual guidance: ${guidesCognitively ? "PASSED" : "FAILED"}`);
  yield* Console.log(`\nFinal Verdict: ${passed ? "✅ ALL EVALUATION CRITERIA PASSED" : "❌ EVALUATION FAILED"}\n`);

  return { passed, output: result.output };
}).pipe(
  Effect.provide(Layer.mergeAll(
    GeminiModel
  ))
);

Effect.runPromise(runSocraticModeEval);
