import { Effect } from "effect";
import { ArtifactRepository } from "../artifacts/artifact.ts";
import { KnowledgeRepository } from "../knowledge/knowledge-profile.ts";
import {
  MaterialRepository,
  type MaterialNotFound,
  type MaterialRepositoryError
} from "./material.ts";
import type { ArtifactRepositoryError } from "../artifacts/artifact.ts";
import type { KnowledgeRepositoryError } from "../knowledge/knowledge-profile.ts";

export const deleteMaterialCascade = (
  materialId: string
): Effect.Effect<
  { readonly success: true; readonly id: string },
  MaterialNotFound | MaterialRepositoryError | ArtifactRepositoryError | KnowledgeRepositoryError,
  MaterialRepository | ArtifactRepository | KnowledgeRepository
> =>
  Effect.gen(function* () {
    const materials = yield* MaterialRepository;
    const artifacts = yield* ArtifactRepository;
    const knowledge = yield* KnowledgeRepository;

    const relatedArtifacts = (yield* artifacts.listArtifacts({})).filter(
      (artifact) => artifact.sourceMaterialId === materialId
    );
    yield* Effect.forEach(
      relatedArtifacts,
      (artifact) => artifacts.deleteArtifact(artifact.id),
      { concurrency: 1 }
    );
    yield* knowledge.removeGapsByMaterialId(materialId);
    yield* materials.delete(materialId);
    return { success: true as const, id: materialId };
  });
