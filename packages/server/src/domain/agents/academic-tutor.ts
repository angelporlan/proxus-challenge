import { Console, Effect, Layer, Stream } from "effect";
import { Model as AiModel } from "effect/unstable/ai";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { SessionRepository, AgentHarness, AgentSession } from "./harness/index.ts";
import { GeminiModel } from "./gemini.ts";
import { FileSessionRepository } from "../../infra/agents/file-session-repository.ts";
import { MaterialRepository } from "../materials/material.ts";
import { ArtifactRepository } from "../artifacts/artifact.ts";
import { KnowledgeRepository } from "../knowledge/knowledge-profile.ts";
import { FileMaterialRepository } from "../../infra/materials/file-material-repository.ts";
import { PopplerPdfService } from "../../infra/materials/poppler-pdf-service.ts";
import { FileArtifactRepository } from "../../infra/artifacts/file-artifact-repository.ts";
import { FileKnowledgeRepository } from "../../infra/knowledge/file-knowledge-repository.ts";
import { makeMaterialCommands } from "./academic-tutor/material-commands.ts";
import { makeArtifactCommands } from "./academic-tutor/artifact-commands.ts";
import { makeKnowledgeCommands } from "./academic-tutor/knowledge-commands.ts";
import { AcademicTutorSkills } from "./academic-tutor/skills/index.ts";

export interface AcademicTutorHarnessOptions {
  readonly mode?: "socratic" | "explanatory" | undefined;
  readonly activeMaterialIds?: readonly string[] | undefined;
  readonly knowledgeProfileContext?: string | undefined;
}

export const makeAcademicTutorHarness = (
  materialRepository: MaterialRepository,
  artifactRepository: ArtifactRepository,
  knowledgeRepository?: KnowledgeRepository,
  options: AcademicTutorHarnessOptions = {}
) => {
  const pedagogicalModeInstruction = options.mode === "socratic"
    ? `\n\n=== PEDAGOGICAL MODE: SOCRATIC TUTOR ===\n- STRICT RULE: Do not give the direct answer or final solution immediately.\n- Guide the student by asking thoughtful, leading questions, offering hints, or presenting counter-examples so they deduce the concept on their own.\n- Break down complex concepts into small, accessible cognitive steps.`
    : `\n\n=== PEDAGOGICAL MODE: EXPLANATORY & STRUCTURED TUTOR ===\n- Provide a comprehensive, clear, and well-structured explanation with clear bullet points, definitions, and practical examples.\n- Quote definitions and cite page numbers directly from the referenced materials.`;

  const activeMaterialsContext = options.activeMaterialIds && options.activeMaterialIds.length > 0
    ? `\n\n=== ACTIVE DOCUMENT CONTEXT ===\nThe student is actively focusing on the following material(s): ${options.activeMaterialIds.join(", ")}.\nWhen answering or searching, prioritize these documents.`
    : "";

  const knowledgeContext = options.knowledgeProfileContext
    ? `\n\n${options.knowledgeProfileContext}`
    : "";

  const systemPrompt = `You are PROXUS Academic Tutor, an expert AI tutor specialized in active learning, rigorous academic explanation, and PDF study materials.

Always respond to the student in Spanish in a pedagogical, clear, encouraging, and structured manner.

Core Capabilities & Workflow:
1. Search & Visual Reading:
   - When asked a specific question about uploaded PDFs or terms, load 'search-materials' and run 'materials search <materialId> <query>' to locate the exact page numbers.
   - Once relevant pages are found, call 'materials view <materialId> <pages>' to inspect the page images and layout.
   - Quote definitions accurately and always cite the exact page numbers (e.g. "En la página 2 encontramos...").
2. Creating Study Artifacts:
   - When asked for study resources, load 'create-study-artifacts' and execute 'artifacts create <json>' to generate high-quality notes, quizzes, or exam tests.
3. Reviewing Knowledge Gaps & Student Errors:
   - Load 'review-knowledge-gaps' to inspect past quiz errors with 'knowledge gaps' and proactively help the student master their weak points.
   - When the student understands a previously failed concept, mark it resolved with 'knowledge master <gapId>'.
4. Conclude every turn with a rich, formatted, natural language explanation.${pedagogicalModeInstruction}${activeMaterialsContext}${knowledgeContext}`;

  const commands = [
    makeMaterialCommands(materialRepository),
    makeArtifactCommands(artifactRepository),
    ...(knowledgeRepository ? [makeKnowledgeCommands(knowledgeRepository)] : [])
  ];

  return AgentHarness.make({
    name: systemPrompt,
    skills: AcademicTutorSkills,
    commands
  });
};

const KnowledgeLive = FileKnowledgeRepository.layer(".data/knowledge").pipe(
  Layer.provide(NodeServices.layer)
);

const ArtifactsLive = FileArtifactRepository.layer(".data/artifacts").pipe(
  Layer.provide(KnowledgeLive),
  Layer.provide(NodeServices.layer)
);

export const academicTutorAgent = Effect.gen(function* () {
  const provider = yield* AiModel.ProviderName;
  const modelName = yield* AiModel.ModelName;
  const sessionRepository = yield* SessionRepository;
  const materialRepository = yield* MaterialRepository;
  const artifactRepository = yield* ArtifactRepository;
  const knowledgeRepository = yield* KnowledgeRepository;
  const task = process.argv.slice(2).join(" ").trim() || "List my uploaded materials.";
  const sessionId = process.env.AGENT_SESSION_ID ?? "academic-tutor-demo";
  const storedSession = yield* sessionRepository.getSession(sessionId).pipe(
    Effect.catchTag("SessionNotFound", () => sessionRepository.makeSession({ id: sessionId }))
  );

  const activeGaps = yield* knowledgeRepository.listActiveGaps().pipe(Effect.catch(() => Effect.succeed([])));
  const knowledgeProfileContext = activeGaps.length > 0
    ? `=== STUDENT KNOWLEDGE GAPS ===\nThe student has struggled with the following questions:\n` +
      activeGaps.map((g) => `- [${g.topic}] Question: "${g.question}" (Student answered: "${g.studentAnswer}", Correct: "${g.correctAnswer}")`).join("\n") +
      `\nProactively address these weak points when relevant.`
    : "";

  const harness = makeAcademicTutorHarness(materialRepository, artifactRepository, knowledgeRepository, {
    knowledgeProfileContext
  });
  const session = AgentSession.make(harness);

  console.log(`Provider: ${provider}`);
  console.log(`Model: ${modelName}`);
  console.log(`Session: ${sessionId}`);
  console.log("Conversation messages:");

  const messages = yield* session.stream({
    input: task,
    messages: storedSession.messages,
    maxSteps: 8
  }).pipe(
    Stream.provide(harness.layer),
    Stream.tap((message) => Effect.gen(function* () {
      yield* sessionRepository.appendMessages({
        sessionId,
        messages: [message]
      });
      yield* Console.log(JSON.stringify(message, null, 2));
    })),
    Stream.runCollect
  );

  let output = "";
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message?.role === "assistant") {
      output = message.content;
      break;
    }
  }

  console.log(output);

  return output;
}).pipe(
  Effect.provide(Layer.mergeAll(
    GeminiModel,
    FileSessionRepository.layer(".data/agent-sessions").pipe(
      Layer.provide(NodeServices.layer)
    ),
    FileMaterialRepository.layer(".data/materials/pdfs").pipe(
      Layer.provide(PopplerPdfService.layer),
      Layer.provide(NodeServices.layer)
    ),
    ArtifactsLive,
    KnowledgeLive
  ))
);

Effect.runPromise(academicTutorAgent);
