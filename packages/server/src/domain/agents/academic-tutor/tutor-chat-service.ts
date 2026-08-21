import { Context, Effect, Layer, Stream } from "effect";
import { LanguageModel } from "effect/unstable/ai";
import type { TutorChatRequest, TutorChatResponse, TutorChatStreamEvent } from "@proxus/shared";
import { ArtifactRepository } from "../../artifacts/artifact.ts";
import { MaterialRepository } from "../../materials/material.ts";
import { KnowledgeRepository } from "../../knowledge/knowledge-profile.ts";
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

    const buildSession = (input: TutorChatRequest) => Effect.gen(function* () {
      const activeGaps = yield* knowledgeRepository.listActiveGaps().pipe(Effect.catch(() => Effect.succeed([])));
      const knowledgeProfileContext = activeGaps.length > 0
        ? `=== STUDENT KNOWLEDGE GAPS & ACTIVE WEAKNESSES ===\nThe student recently failed the following question(s) in practice quizzes:\n` +
          activeGaps.map((g) => `- [${g.topic}] Question: "${g.question}" (Student Answer: "${g.studentAnswer}", Correct: "${g.correctAnswer}")`).join("\n") +
          `\nWhen the student asks what to review or asks questions related to these concepts, proactively address their misconceptions.`
        : "";

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
