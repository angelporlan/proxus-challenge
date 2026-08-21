import { Context, Effect, Layer, Stream } from "effect";
import { LanguageModel } from "effect/unstable/ai";
import type { TutorChatRequest, TutorChatResponse, TutorChatStreamEvent, UserProfile } from "@proxus/shared";
import { ArtifactRepository } from "../../artifacts/artifact.ts";
import { MaterialRepository } from "../../materials/material.ts";
import { KnowledgeRepository } from "../../knowledge/knowledge-profile.ts";
import { UserProfileRepository } from "../../user-profile/user-profile.ts";
import { AgentSession } from "../harness/index.ts";
import { makeAcademicTutorHarness } from "../academic-tutor.ts";

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

      let userProfileContext = "";
      if (userProfile && (userProfile.onboardingCompleted || userProfile.educationLevel || userProfile.study || userProfile.mainDifficulty || userProfile.mainBlocker || userProfile.goal)) {
        const lines: string[] = ["=== STUDENT LEARNING PROFILE & PERSONALIZATION ==="];
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
        if (userProfile.goal || userProfile.goalLabel) {
          lines.push(`- Primary Goal: ${userProfile.goalLabel ?? userProfile.goal}`);
        }

        lines.push("\nPEDAGOGICAL INSTRUCTIONS BASED ON PROFILE:");
        const level = ((userProfile.educationLevel ?? "") + " " + (userProfile.educationLevelLabel ?? "")).toLowerCase();
        if (level.includes("bachillerato") || level.includes("high_school")) {
          lines.push("- High School (Bachillerato): Use intuitive, step-by-step explanations with vivid everyday analogies and prepare them for college entrance (EVAU/Selectividad) where relevant. Avoid overly dense academic jargon.");
        } else if (level.includes("universidad") || level.includes("university")) {
          lines.push("- University: Provide technical depth, rigorous conceptual clarity, and formal grounding while remaining engaging and supportive.");
        } else if (level.includes("oposiciones") || level.includes("civil_service")) {
          lines.push("- Civil Service Exams (Oposiciones): Emphasize literal terminology, structured syllabus mastery, key articles/dates, and test-oriented memory triggers.");
        } else if (level.includes("fp") || level.includes("formación profesional") || level.includes("vocational")) {
          lines.push("- Vocational Training (FP): Emphasize practical application, real-world case scenarios, and hands-on understanding.");
        }

        const diff = ((userProfile.mainDifficulty ?? "") + " " + (userProfile.mainDifficultyLabel ?? "")).toLowerCase();
        if (diff.includes("theory") || diff.includes("teoría")) {
          lines.push("- Student struggles with Theory: Always introduce complex abstract ideas with concrete real-life examples or analogies first before formal definitions.");
        } else if (diff.includes("exercises") || diff.includes("ejercicios")) {
          lines.push("- Student struggles with Exercises: Break problems down into clear, numbered steps and guide them through sample problems proactively.");
        } else if (diff.includes("memor") || diff.includes("recordar")) {
          lines.push("- Student struggles with Memorization: Provide mnemonic devices, acronyms, and quick retrieval check questions.");
        } else if (diff.includes("concentr") || diff.includes("distra")) {
          lines.push("- Student struggles with Focus: Keep responses concise, modular, and in easily digestible chunks. Ask for small confirmations rather than dumping large texts.");
        }

        const blocker = (userProfile.mainBlocker ?? "").toLowerCase();
        if (blocker.includes("tiempo") || blocker.includes("poco tiempo")) {
          lines.push("- Blocker (Lack of time): Prioritize high-yield concepts, bulleted summaries, and maximum efficiency in explanations.");
        } else if (blocker.includes("bloqueo") || blocker.includes("exámenes")) {
          lines.push("- Blocker (Exam anxiety / mental block): Provide positive reinforcement, clear checklists, and confidence-building practice questions.");
        }

        if (userProfile.goal || userProfile.goalLabel) {
          lines.push(`- Goal: Orient practice and feedback towards helping them achieve: "${userProfile.goalLabel ?? userProfile.goal}".`);
        }

        userProfileContext = lines.join("\n");
      }

      const knowledgeProfileContext = [
        userProfileContext,
        activeGaps.length > 0
          ? `=== STUDENT KNOWLEDGE GAPS & ACTIVE WEAKNESSES ===\nThe student recently failed the following question(s) in practice quizzes:\n` +
            activeGaps.map((g) => `- [${g.topic}] Question: "${g.question}" (Student Answer: "${g.studentAnswer}", Correct: "${g.correctAnswer}")`).join("\n") +
            `\nWhen the student asks what to review or asks questions related to these concepts, proactively address their misconceptions.`
          : ""
      ].filter(Boolean).join("\n\n");

      const activeMaterialIds = [
        ...(input.activeMaterialIds ?? []),
        ...(input.documentReferences ?? [])
      ];

      const harness = makeAcademicTutorHarness(materialRepository, artifactRepository, knowledgeRepository, {
        mode: input.mode,
        activeMaterialIds,
        knowledgeProfileContext
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
            Effect.map(({ session, harness }) =>
              session.stream(sessionInput(input)).pipe(
                Stream.map((message): TutorChatStreamEvent => ({ type: "message", message })),
                Stream.concat(Stream.succeed({ type: "done" as const })),
                Stream.provide(harness.layer)
              )
            )
          )
        )
    };
  })
);
