import { Context, Effect, Layer, Queue, Stream } from "effect";
import { LanguageModel } from "effect/unstable/ai";
import type { TutorChatRequest, TutorChatResponse, TutorChatStreamEvent, UserProfile } from "@proxus/shared";
import { ArtifactRepository } from "../../artifacts/artifact.ts";
import { MaterialRepository } from "../../materials/material.ts";
import { KnowledgeRepository } from "../../knowledge/knowledge-profile.ts";
import { UserProfileRepository } from "../../user-profile/user-profile.ts";
import { AgentSession, type AgentMessage } from "../harness/index.ts";
import { makeAcademicTutorHarness } from "../academic-tutor.ts";
import { generateTutorRecommendations, hasCreatedArtifact } from "./recommendation-service.ts";

export interface TutorChatService {
  readonly sendMessage: (
    input: TutorChatRequest
  ) => Effect.Effect<TutorChatResponse, unknown, LanguageModel.LanguageModel>;
  readonly streamMessage: (
    input: TutorChatRequest
  ) => Stream.Stream<TutorChatStreamEvent, unknown, LanguageModel.LanguageModel>;
}

export const TutorChatService = Context.Service<TutorChatService>(
  "@proxus/server/agents/academic-tutor/TutorChatService"
);

export const TutorChatServiceLive = Layer.effect(
  TutorChatService,
  Effect.gen(function* () {
    const materialRepository = yield* MaterialRepository;
    const artifactRepository = yield* ArtifactRepository;
    const knowledgeRepository = yield* KnowledgeRepository;
    const userProfileRepository = yield* UserProfileRepository;

    const buildSession = (input: TutorChatRequest) => Effect.gen(function* () {
      const activeGaps = yield* knowledgeRepository.listActiveGaps().pipe(Effect.catch(() => Effect.succeed([])));
      const userProfile: UserProfile = yield* userProfileRepository.getProfile().pipe(Effect.catch(() => Effect.succeed<UserProfile>({ onboardingCompleted: false })));
      const materialsList = yield* materialRepository.list().pipe(Effect.catch(() => Effect.succeed([])));
      const totalMaterialsCount = materialsList.length;

      let userProfileContext = "";
      if (userProfile && (userProfile.onboardingCompleted || userProfile.educationLevel || userProfile.study || userProfile.mainDifficulty || userProfile.mainBlocker || userProfile.helpPreference)) {
        const lines: string[] = ["=== STUDENT LEARNING PROFILE & ADAPTIVE PEDAGOGY ==="];
        if (userProfile.educationLevel || userProfile.educationLevelLabel) {
          lines.push(`- Education Level: ${userProfile.educationLevelLabel ?? userProfile.educationLevel}`);
        }
        if (userProfile.study) {
          lines.push(`- Degree / Field / Exam: ${userProfile.study}`);
        }
        if (userProfile.mainDifficulty || userProfile.mainDifficultyLabel) {
          lines.push(`- Main Learning Difficulty: ${userProfile.mainDifficultyLabel ?? userProfile.mainDifficulty}`);
        }
        if (userProfile.mainBlocker) {
          lines.push(`- Current Study Blocker / Obstacle: ${userProfile.mainBlocker}`);
        }
        if (userProfile.helpPreference || userProfile.helpPreferenceLabel) {
          lines.push(`- Preferred Help / Explanation Style: ${userProfile.helpPreferenceLabel ?? userProfile.helpPreference}`);
        }

        lines.push("\nDYNAMIC FORMAT & PEDAGOGICAL ADAPTATION (Apply IMPLICITLY without citing profile fields):");

        const level = ((userProfile.educationLevel ?? "") + " " + (userProfile.educationLevelLabel ?? "")).toLowerCase();
        if (level.includes("bachillerato") || level.includes("high_school")) {
          lines.push("- High School (Bachillerato): Use intuitive explanations with vivid everyday analogies; prepare for college entrance (EVAU/Selectividad) where relevant; avoid overly dense academic jargon.");
        } else if (level.includes("universidad") || level.includes("university")) {
          lines.push("- University: Provide technical depth, rigorous conceptual clarity, and formal grounding while remaining engaging and supportive.");
        } else if (level.includes("oposiciones") || level.includes("civil_service")) {
          lines.push("- Civil Service Exams (Oposiciones): Emphasize literal terminology, structured syllabus mastery, key articles/dates, and test-oriented memory triggers.");
        } else if (level.includes("fp") || level.includes("formación profesional") || level.includes("vocational")) {
          lines.push("- Vocational Training (FP): Emphasize practical application, real-world case scenarios, and hands-on understanding.");
        }

        const diff = ((userProfile.mainDifficulty ?? "") + " " + (userProfile.mainDifficultyLabel ?? "")).toLowerCase();
        if (diff.includes("theory") || diff.includes("teoría")) {
          lines.push("- Structure Adaptation (Theory difficulty): Avoid dense walls of abstract text. Lead with a tangible analogy, split concepts into small digestible blocks, and insert a brief check question.");
        } else if (diff.includes("exercises") || diff.includes("ejercicios")) {
          lines.push("- Structure Adaptation (Exercises difficulty): Break problem-solving into clear numbered steps and guide through sample exercises with immediate feedback.");
        } else if (diff.includes("memor") || diff.includes("recordar")) {
          lines.push("- Structure Adaptation (Memorization difficulty): Provide mnemonic devices, acronyms, and quick active-recall check questions.");
        } else if (diff.includes("concentr") || diff.includes("distra")) {
          lines.push("- Structure Adaptation (Focus difficulty): Keep responses concise, modular, and in easily digestible chunks. Ask for small confirmations rather than dumping large texts.");
        } else if (diff.includes("constan") || diff.includes("consistency")) {
          lines.push("- Structure Adaptation (Consistency difficulty): Propose micro-sprints (e.g. 5-minute study blocks or 1 single practice question at a time), set clear immediate next steps, and celebrate micro-milestones.");
        }

        const blocker = (userProfile.mainBlocker ?? "").toLowerCase();
        if (blocker.includes("tiempo") || blocker.includes("poco tiempo") || blocker.includes("time")) {
          lines.push("- Structure Adaptation (Lack of time): Prioritize high-yield 80/20 takeaways. Format with scannable executive bullet points and offer fast 5/15 minute options.");
        } else if (blocker.includes("constan") || blocker.includes("hábito")) {
          lines.push("- Structure Adaptation (Consistency blocker): Break tasks into small manageable blocks. Avoid overwhelming study plans; focus on 1 immediate win.");
        } else if (blocker.includes("bloqueo") || blocker.includes("exámenes")) {
          lines.push("- Structure Adaptation (Exam anxiety / mental block): Provide positive reinforcement, clear checklists, and confidence-building practice questions.");
        }

        const helpPref = ((userProfile.helpPreference ?? "") + " " + (userProfile.helpPreferenceLabel ?? "")).toLowerCase();
        if (helpPref.includes("step_by_step") || helpPref.includes("paso a paso")) {
          lines.push("- Preferred Explanation Mode: Break down difficult concepts into sequential, numbered steps (1., 2., 3.).");
        } else if (helpPref.includes("examples") || helpPref.includes("ejemplo")) {
          lines.push("- Preferred Explanation Mode: Anchor every abstract definition immediately with a realistic, relatable example.");
        } else if (helpPref.includes("simple") || helpPref.includes("sencilla")) {
          lines.push("- Preferred Explanation Mode: Use clean, plain language and eliminate unnecessary technical jargon.");
        } else if (helpPref.includes("guided_questions") || helpPref.includes("preguntas")) {
          lines.push("- Preferred Explanation Mode: Use active Socratic prompts and questions to help the student deduce the insight.");
        } else if (helpPref.includes("direct") || helpPref.includes("grano")) {
          lines.push("- Preferred Explanation Mode: Be ultra-concise, high-density, and straight to the point with zero padding.");
        }

        lines.push("- RULE: Never explicitly say 'Como me dijiste que...' or 'Dado que tu perfil indica...'. Apply these guidelines silently and naturally.");

        userProfileContext = lines.join("\n");
      }

      const docRefsContext = (input.documentReferences && input.documentReferences.length > 0)
        ? `=== REFERENCED DOCUMENTS IN THIS TURN ===\nThe student explicitly referenced or attached:\n` +
          input.documentReferences.map((ref) => `- ${ref}`).join("\n")
        : "";

      const knowledgeProfileContext = [
        userProfileContext,
        docRefsContext,
        activeGaps.length > 0
          ? `=== STUDENT KNOWLEDGE GAPS & ACTIVE WEAKNESSES ===\nThe student recently failed the following question(s) in practice quizzes:\n` +
            activeGaps.map((g) => `- [${g.topic}] Question: "${g.question}" (Student Answer: "${g.studentAnswer}", Correct: "${g.correctAnswer}")`).join("\n") +
            `\nWhen the student asks what to review or asks questions related to these concepts, proactively address their misconceptions.`
          : ""
      ].filter(Boolean).join("\n\n");

      const activeMaterialIds = input.activeMaterialIds ?? [];

      const harness = makeAcademicTutorHarness(materialRepository, artifactRepository, knowledgeRepository, {
        mode: input.mode,
        activeMaterialIds,
        knowledgeProfileContext,
        totalMaterialsCount
      });

      const session = AgentSession.make(harness);
      return { harness, session };
    });

    const sessionInput = (input: TutorChatRequest) => ({
      input: input.input,
      messages: input.messages,
      maxSteps: input.maxSteps ?? 8
    });

    return {
      sendMessage: (input) =>
        buildSession(input).pipe(
          Effect.flatMap(({ session, harness }) =>
            session.run(sessionInput(input)).pipe(Effect.provide(harness.layer))
          )
        ),
      streamMessage: (input) =>
        Stream.unwrap(
          buildSession(input).pipe(
            Effect.map(({ session, harness }) => {
              const turnMessages: AgentMessage[] = [];

              return Stream.callback<TutorChatStreamEvent, unknown, LanguageModel.LanguageModel>((queue) =>
                session.stream(sessionInput(input)).pipe(
                  Stream.provide(harness.layer),
                  Stream.tap((message) => Effect.gen(function* () {
                    turnMessages.push(message);
                    yield* Queue.offer(queue, { type: "message", message });
                  })),
                  Stream.runDrain,
                  Effect.andThen(Effect.gen(function* () {
                    const assistantMessage = [...turnMessages]
                      .reverse()
                      .find((message): message is AgentMessage & { readonly role: "assistant" } => message.role === "assistant");

                    if (assistantMessage !== undefined) {
                      const recommendations = yield* generateTutorRecommendations({
                        mode: input.mode,
                        userInput: input.input,
                        assistantOutput: assistantMessage.content,
                        recentMessages: [...(input.messages ?? []), ...turnMessages],
                        createdArtifact: hasCreatedArtifact(turnMessages)
                      });
                      yield* Queue.offer(queue, { type: "recommendations", recommendations });
                    }

                    yield* Queue.offer(queue, { type: "done" });
                  })),
                  Effect.andThen(Queue.end(queue)),
                  Effect.matchCauseEffect({
                    onFailure: (cause) => Queue.failCause(queue, cause),
                    onSuccess: () => Effect.void
                  })
                )
              );
            })
          )
        )
    };
  })
);
