import { Effect } from "effect";
import * as AgentCli from "../harness/index.ts";
import { type KnowledgeRepository } from "../../knowledge/knowledge-profile.ts";

export const makeKnowledgeCommands = (repository: KnowledgeRepository) => {
  const listGaps = AgentCli.Command.withExamples([
    { command: "knowledge gaps", description: "List all active knowledge gaps with failed questions and explanations" }
  ])(
    AgentCli.Command.withDescription("List all active student knowledge gaps")(
      AgentCli.Command.exec("gaps", {}, () =>
        repository.listActiveGaps().pipe(
          Effect.map((gaps) => {
            if (gaps.length === 0) {
              return "No active knowledge gaps found! The student has answered all recent quiz questions correctly.";
            }

            return gaps.map((gap, index) =>
              `${index + 1}. [${gap.id}] Topic: ${gap.topic}\n   Question: "${gap.question}"\n   Student Answer: "${gap.studentAnswer}" (Correct: "${gap.correctAnswer}")\n   Explanation: ${gap.explanation}\n   Status: ${gap.status}`
            ).join("\n\n");
          }),
          Effect.catch((error) => Effect.succeed(`Error reading knowledge profile: ${String(error)}`))
        )
      )
    )
  );

  const summary = AgentCli.Command.withExamples([
    { command: "knowledge summary", description: "Get a high-level summary of total attempts and weak topics" }
  ])(
    AgentCli.Command.withDescription("Summary of student performance and weak topics")(
      AgentCli.Command.exec("summary", {}, () =>
        repository.getProfile().pipe(
          Effect.map((profile) => {
            const activeGaps = profile.gaps.filter((g) => g.status === "active");
            const reviewingGaps = profile.gaps.filter((g) => g.status === "reviewing");
            const masteredGaps = profile.gaps.filter((g) => g.status === "mastered");

            const topicCounts: Record<string, number> = {};
            for (const gap of activeGaps) {
              topicCounts[gap.topic] = (topicCounts[gap.topic] ?? 0) + 1;
            }

            const topicsList = Object.entries(topicCounts)
              .map(([topic, count]) => `- ${topic}: ${count} pending gap(s)`)
              .join("\n");

            return `Student Knowledge Summary:
Total quiz attempts: ${profile.totalAttempts}
Active gaps: ${activeGaps.length}
In review: ${reviewingGaps.length}
Mastered: ${masteredGaps.length}

Weak areas by topic:
${topicsList || "None"}`;
          }),
          Effect.catch((error) => Effect.succeed(`Error reading knowledge summary: ${String(error)}`))
        )
      )
    )
  );

  const review = AgentCli.Command.withExamples([
    { command: "knowledge review gap-abc-q1", description: "Mark a gap as actively reviewing" }
  ])(
    AgentCli.Command.withDescription("Mark a knowledge gap as in review")(
      AgentCli.Command.exec("review", {
        gapId: AgentCli.Argument.string("gapId").pipe(
          AgentCli.Argument.withDescription("Gap ID to mark as in review")
        )
      }, ({ gapId }) =>
        repository.updateGapStatus(gapId, "reviewing").pipe(
          Effect.map((gap) => `Marked gap "${gap.id}" (${gap.topic}) as in review.`),
          Effect.catch((error) => Effect.succeed(`Error updating gap: ${String(error)}`))
        )
      )
    )
  );

  const master = AgentCli.Command.withExamples([
    { command: "knowledge master gap-abc-q1", description: "Mark a gap as mastered after student understands" }
  ])(
    AgentCli.Command.withDescription("Mark a knowledge gap as mastered")(
      AgentCli.Command.exec("master", {
        gapId: AgentCli.Argument.string("gapId").pipe(
          AgentCli.Argument.withDescription("Gap ID to mark as mastered")
        )
      }, ({ gapId }) =>
        repository.updateGapStatus(gapId, "mastered").pipe(
          Effect.map((gap) => `Congratulations! Marked gap "${gap.id}" (${gap.topic}) as mastered.`),
          Effect.catch((error) => Effect.succeed(`Error updating gap: ${String(error)}`))
        )
      )
    )
  );

  return AgentCli.Command.group("knowledge", [listGaps, summary, review, master] as const).pipe(
    AgentCli.Command.withDescription("Student knowledge profile and gap analysis commands")
  );
};
