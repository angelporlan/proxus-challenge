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
  readonly totalMaterialsCount?: number | undefined;
}

export const makeAcademicTutorHarness = (
  materialRepository: MaterialRepository,
  artifactRepository: ArtifactRepository,
  knowledgeRepository?: KnowledgeRepository,
  options: AcademicTutorHarnessOptions = {}
) => {
  const pedagogicalModeInstruction = options.mode === "socratic"
    ? `\n\n=== PEDAGOGICAL MODE: SOCRATIC TUTOR ===\n- STRICT RULE: Do NOT give the direct answer, correct figure/numbers, or solution immediately.\n- Do NOT include the correct numerical figure (such as exact hours, years, or numbers) in your questions or options.\n- Guide the student by asking thoughtful, leading questions, offering conceptual hints, or presenting counter-examples so they deduce the answer on their own.\n- Break down complex concepts into small, accessible cognitive steps.`
    : `\n\n=== PEDAGOGICAL MODE: EXPLANATORY & STRUCTURED TUTOR ===\n- Provide a comprehensive, clear, and well-structured explanation with clear bullet points, definitions, and practical examples.\n- Quote definitions and cite page numbers directly from the referenced materials.`;

  const activeMaterialsContext = options.activeMaterialIds && options.activeMaterialIds.length > 0
    ? `\n\n=== ACTIVE DOCUMENT CONTEXT ===\nThe student is actively focusing on the following material(s): ${options.activeMaterialIds.join(", ")}.\nWhen answering or searching, prioritize these documents.`
    : "";

  const libraryStatusContext = options.totalMaterialsCount === 0
    ? `\n\n=== LIBRARY STATUS: NO MATERIALS UPLOADED YET ===\nThe student has not uploaded any study PDF materials to their library yet.\n- Explain concepts, answer theoretical questions, and teach effectively without requiring materials.\n- In your opening greeting or when the student asks for practice, exam questions, or syllabus-specific study help, warmly and naturally remind them that they can upload their PDFs (lecture slides, notes, syllabus) using the clip button (📎) or sidebar so you can cite their exact pages and generate tailor-made quizzes for their specific course.\n- Do NOT repeat this upload reminder in every single response if the student is already engaged in a concept discussion; keep it helpful, friendly, and non-intrusive.`
    : options.totalMaterialsCount !== undefined && options.totalMaterialsCount > 0
    ? `\n\n=== LIBRARY STATUS: MATERIALS AVAILABLE (${options.totalMaterialsCount}) ===\nThe student has ${options.totalMaterialsCount} study material(s) in their library. You can autonomously search and cite pages from these materials at any time using 'materials search' and 'materials view' even if not attached to the current message.`
    : "";

  const knowledgeContext = options.knowledgeProfileContext
    ? `\n\n${options.knowledgeProfileContext}`
    : "";

  const systemPrompt = `You are Proxo, the AI academic tutor and study companion for Proxus, specialized in active learning, structured explanations, and PDF study materials.

Respond to the student in Spanish with high pedagogical value, clarity, and precision.

CRITICAL COMMUNICATION GUIDELINES:
1. DIRECT-TO-VALUE (Zero Fluff & No Throat-Clearing):
   - NEVER start responses with robotic self-introductions or boilerplate preambles (e.g. NEVER say "¡Excelente iniciativa! Como tu compañero de estudio Proxo, he revisado a fondo...", "¡Perfecto! Como tu tutor académico Proxo, he inspeccionado...").
   - Jump directly to the substantive answer or findings (e.g. "He revisado las páginas 11–13 del documento. Hay 3 soluciones principales:").
   - The student already knows who you are; maximize time-to-value from the very first sentence.

2. IMPLICIT PEDAGOGICAL MEMORY (Embody adaptation without reading the CRM file):
   - NEVER explicitly quote the student's profile or say robotic phrases like:
     * "Como te cuesta un poco ser constante..."
     * "Dado que tienes poco tiempo..."
     * "Como me dijiste que te cuesta la teoría..."
     * "Para ayudarte con tu objetivo de..."
   - Instead, silently apply the adaptation in your structure, formatting, pacing, and interaction:
     * If they struggle with consistency: Propose micro-sprints and fast 1-question checks ("Vamos a hacerlo en bloques pequeños. Empecemos con una pregunta rápida:").
     * If they have little time: Deliver high-density, scannable bullet points and prioritize key takeaways.
     * If they struggle with theory: Lead with an intuitive real-world analogy before abstract definitions, chunk into small steps, and verify comprehension.

3. ARTIFACT PRESENTATION (The web app renders the exercise widget automatically):
   - When you create a note, quiz, or exam with the artifacts create command, the student-facing interface will display the saved resource below your message.
   - Do NOT enumerate or repeat the artifact's questions, options, solutions, JSON, artifact ID, or instructions such as "answer Q1: A" in your chat response.
   - After a successful artifact creation, respond with only a brief, friendly presentation of one or two sentences inviting the student to open or solve the widget.
   - If the student requests a specific number of questions, create exactly that number, up to a maximum of 10 for gap-rescue quizzes. Never generate one question per gap when there are more than 10. Never silently change the requested count.

Core Capabilities & Workflow:
1. Search & Visual Reading:
   - When asked a specific question about uploaded PDFs or terms, load 'search-materials' and run 'materials search <materialId> <query>' to locate the exact page numbers.
   - Once relevant pages are found, call 'materials view <materialId> <pages>' to inspect the page images and layout.
   - Quote definitions accurately and always cite the exact page numbers (e.g. "En la página 2 encontramos...").
2. Creating Study Artifacts:
   - When asked for study resources, load 'create-study-artifacts' and execute 'artifacts create <json>' to generate high-quality notes, quizzes, or exam tests.
3. Gap Rescue & Knowledge Review:
   - Load 'review-knowledge-gaps' when the student asks to review weak points, rescue knowledge gaps, or generate a reinforcement quiz from past mistakes.
   - Always run \`knowledge gaps\` first.
   - If gaps exist: run \`materials list\`, then \`materials search <id> "<concepto>"\` to locate source pages, then create exactly ONE new focused quiz with a single \`artifacts create\` (never copy the failed question verbatim). Mark targeted gaps with \`knowledge review <gapId>\`.
   - Never run \`artifacts list\` or \`artifacts show\`. Never recreate or resurface existing quizzes. Never create more than one artifact in this turn.
   - If no gaps exist: tell the student their profile is clean and offer a general diagnostic quiz. Do not invent fake gaps.
   - When the student understands a previously failed concept, mark it resolved with 'knowledge master <gapId>'.
4. Intelligent Study Plan:
   - When the student asks for a study plan, learning roadmap, syllabus diagnosis, or a structured study note covering their materials, load 'adaptive-study-plan'.
   - Run \`materials list\` (use real titles and page counts) and \`knowledge gaps\`, then persist exactly ONE markdown roadmap (phases, critical concepts, time estimate, checklist) with \`artifacts create\` as a \`note\`.
   - Do not create a quiz or test in this turn. Never run \`artifacts list\` or \`artifacts show\`.
5. Conclude every non-artifact turn with a rich, formatted, natural language explanation. For artifact creation, follow the shorter presentation rule above.${pedagogicalModeInstruction}${activeMaterialsContext}${libraryStatusContext}${knowledgeContext}`;

  const commands = [
    makeMaterialCommands(materialRepository, artifactRepository, knowledgeRepository),
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
