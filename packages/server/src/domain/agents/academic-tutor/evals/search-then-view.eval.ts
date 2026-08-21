import { Console, Effect, Layer } from "effect";
import { GeminiModel } from "../../gemini.ts";
import { AgentSession } from "../../harness/index.ts";
import { makeAcademicTutorHarness } from "../../academic-tutor.ts";
import { ArtifactRepository } from "../../../artifacts/artifact.ts";
import { MaterialRepository } from "../../../materials/material.ts";

const mockPdfPages = [
  { page: 1, text: "Título: Derecho Constitucional. Índice General. Introducción al Estado de Derecho." },
  { page: 18, text: "Artículo 18 de la Constitución Española. Se garantiza el derecho al honor, a la intimidad personal y familiar y a la propia imagen. El domicilio es inviolable. Ninguna entrada o registro podrá hacerse en él sin consentimiento del titular o resolución judicial, salvo en caso de flagrante delito." },
  { page: 45, text: "Título IV: Del Gobierno y de la Administración. Funciones del poder ejecutivo." }
];


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

export const runSearchThenViewEval = Effect.gen(function* () {
  yield* Console.log("\n========================================================");
  yield* Console.log(" Running AI Eval: Search in Materials Prior to View");
  yield* Console.log("========================================================\n");

  let searchCallCount = 0;
  let viewCallCount = 0;

  const mockRepo = MaterialRepository.of({
    list: () => Effect.succeed([
      {
        id: "constitucion-completa",
        title: "Constitución Española Completa",
        fileName: "constitucion.pdf",
        pageCount: 50,
        uploadedAt: new Date().toISOString()
      }
    ]),
    get: (id) => Effect.succeed({
      id,
      title: "Constitución Española Completa",
      fileName: "constitucion.pdf",
      pageCount: 50,
      uploadedAt: new Date().toISOString()
    }),
    upload: () => Effect.die("Not implemented"),
    delete: () => Effect.void,
    renderPages: (id, pages) => {
      viewCallCount++;
      return Effect.succeed({
        type: "material-page-images",
        material: {
          id,
          title: "Constitución Española Completa",
          fileName: "constitucion.pdf",
          pageCount: 50,
          uploadedAt: new Date().toISOString()
        },
        pages: pages.map((page) => ({
          page,
          mediaType: "image/png" as const,
          data: `data:image/png;base64,${btoa(`Contenido de la página ${page}`)}`
        }))
      });
    },
    getFilePath: () => Effect.succeed("/tmp/constitucion.pdf"),
    searchText: (id, query) => {
      searchCallCount++;
      const qLower = query.toLowerCase();
      const matches = mockPdfPages
        .filter((p) => p.text.toLowerCase().includes(qLower))
        .map((p) => ({
          page: p.page,
          snippet: p.text.slice(0, 120),
          score: 1
        }));
      return Effect.succeed(matches);
    }
  });

  const harness = makeAcademicTutorHarness(mockRepo, makeMockArtifactRepo());
  const session = AgentSession.make(harness);

  const inputPrompt = "En el material 'constitucion-completa', busca qué dice sobre la inviolabilidad del domicilio y dime en qué página se encuentra exactamente.";
  yield* Console.log(`Student Input: "${inputPrompt}"\n`);

  const result = yield* session.run({
    input: inputPrompt,
    maxSteps: 8
  }).pipe(Effect.provide(harness.layer));

  yield* Console.log(`Tutor Response:\n${result.output}\n`);

  // Check if tool was invoked and page 18 was correctly identified
  const calledSearchTool = searchCallCount >= 1;
  const calledViewTool = viewCallCount >= 1;
  const identifiesPage18 = result.output.includes("18") || result.output.includes("página 18") || result.output.includes("pagina 18");
  const mentionsInviolabilidad = result.output.toLowerCase().includes("domicilio") || result.output.toLowerCase().includes("inviolab");
  const passed = calledSearchTool && calledViewTool && identifiesPage18 && mentionsInviolabilidad;

  yield* Console.log("--- Evaluation Criteria Results ---");
  yield* Console.log(`1. Executed 'materials search' tool: ${calledSearchTool ? `PASSED (${searchCallCount} search call(s))` : "FAILED"}`);
  yield* Console.log(`2. Executed 'materials view' after search: ${calledViewTool ? `PASSED (${viewCallCount} render call(s))` : "FAILED"}`);
  yield* Console.log(`3. Located exact page (Page 18): ${identifiesPage18 ? "PASSED" : "FAILED"}`);
  yield* Console.log(`4. Retrieved accurate definition of inviolabilidad: ${mentionsInviolabilidad ? "PASSED" : "FAILED"}`);
  yield* Console.log(`\nFinal Verdict: ${passed ? "✅ ALL EVALUATION CRITERIA PASSED" : "❌ EVALUATION FAILED"}\n`);

  return { passed, output: result.output };
}).pipe(
  Effect.provide(Layer.mergeAll(
    GeminiModel
  ))
);

Effect.runPromise(runSearchThenViewEval);
