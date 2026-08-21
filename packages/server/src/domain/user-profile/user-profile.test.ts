import { describe, it, expect, beforeEach } from "vitest";
import { Effect, Layer, Path } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { FileUserProfileRepository } from "../../infra/user-profile/file-user-profile-repository.ts";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

describe("FileUserProfileRepository", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxus-user-profile-test-"));
    return () => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    };
  });

  const runWithRepo = <A, E>(
    fn: (repo: ReturnType<typeof FileUserProfileRepository.make> extends Effect.Effect<infer R, any, any> ? R : never) => Effect.Effect<A, E>
  ) => {
    return Effect.gen(function* () {
      const repo = yield* FileUserProfileRepository.make(tempDir);
      return yield* fn(repo);
    }).pipe(
      Effect.provide(Layer.mergeAll(NodeFileSystem.layer, Path.layer)),
      Effect.runPromise
    );
  };

  it("returns default profile when no profile file exists", async () => {
    const profile = await runWithRepo((repo) => repo.getProfile());
    expect(profile.onboardingCompleted).toBe(false);
    expect(profile.educationLevel).toBeUndefined();
  });

  it("saves and retrieves full user profile", async () => {
    const saved = await runWithRepo((repo) =>
      repo.saveProfile({
        educationLevel: "university",
        educationLevelLabel: "Universidad",
        study: "Ingeniería Informática",
        mainDifficulty: "understanding_theory",
        mainDifficultyLabel: "Entender la teoría",
        mainBlocker: "Tengo poco tiempo para estudiar",
        goal: "pass_next_exam",
        goalLabel: "Aprobar mi próximo examen",
        onboardingCompleted: true
      })
    );

    expect(saved.onboardingCompleted).toBe(true);
    expect(saved.educationLevel).toBe("university");
    expect(saved.study).toBe("Ingeniería Informática");
    expect(saved.mainDifficulty).toBe("understanding_theory");
    expect(saved.mainBlocker).toBe("Tengo poco tiempo para estudiar");
    expect(saved.goal).toBe("pass_next_exam");
    expect(saved.completedAt).toBeDefined();
    expect(saved.updatedAt).toBeDefined();

    // Verify retrieval on a new repository instance reading the same file
    const retrieved = await runWithRepo((repo) => repo.getProfile());
    expect(retrieved.study).toBe("Ingeniería Informática");
    expect(retrieved.onboardingCompleted).toBe(true);
  });

  it("partially updates existing profile fields while preserving other fields", async () => {
    await runWithRepo((repo) =>
      repo.saveProfile({
        educationLevel: "high_school",
        educationLevelLabel: "Bachillerato",
        study: "2º Bachillerato Ciencias",
        mainDifficulty: "memorizing",
        goal: "pass_next_exam",
        onboardingCompleted: true
      })
    );

    const updated = await runWithRepo((repo) =>
      repo.saveProfile({
        mainDifficulty: "solving_exercises",
        mainDifficultyLabel: "Resolver ejercicios"
      })
    );

    expect(updated.educationLevel).toBe("high_school");
    expect(updated.study).toBe("2º Bachillerato Ciencias");
    expect(updated.mainDifficulty).toBe("solving_exercises");
    expect(updated.mainDifficultyLabel).toBe("Resolver ejercicios");
    expect(updated.onboardingCompleted).toBe(true);
  });

  it("clears user profile and resets state to uncompleted", async () => {
    await runWithRepo((repo) =>
      repo.saveProfile({
        educationLevel: "civil_service",
        study: "Oposiciones a Judicatura",
        onboardingCompleted: true
      })
    );

    await runWithRepo((repo) => repo.clearProfile());

    const reset = await runWithRepo((repo) => repo.getProfile());
    expect(reset.onboardingCompleted).toBe(false);
    expect(reset.educationLevel).toBeUndefined();
    expect(reset.study).toBeUndefined();
  });
});
