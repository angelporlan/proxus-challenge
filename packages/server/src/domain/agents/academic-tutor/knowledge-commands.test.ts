import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import * as AgentCli from "../harness/index.ts";
import { makeKnowledgeCommands } from "./knowledge-commands.ts";
import type { KnowledgeRepository } from "../../knowledge/knowledge-profile.ts";

describe("knowledge commands", () => {
  it("rejects knowledge master without writing the profile", async () => {
    let wrote = false;
    const repository = {
      updateGapStatus: () => {
        wrote = true;
        return Effect.die("must not write mastery");
      }
    } as unknown as KnowledgeRepository;

    const output = await Effect.runPromise(
      AgentCli.execute([makeKnowledgeCommands(repository)], "knowledge master gap-abc-q1")
    );

    expect(String(output)).toContain("mastery is derived from graded attempts");
    expect(wrote).toBe(false);
  });
});
