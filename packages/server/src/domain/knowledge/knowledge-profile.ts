import { Context, Data, Effect } from "effect";
import type { KnowledgeGap, KnowledgeGapStatus, KnowledgeProfile } from "@proxus/shared";

export class GapNotFound extends Data.TaggedError("GapNotFound")<{
  readonly gapId: string;
}> {}

export class KnowledgeRepositoryError extends Data.TaggedError("KnowledgeRepositoryError")<{
  readonly reason: unknown;
}> {}

export interface KnowledgeRepository {
  readonly getProfile: () => Effect.Effect<KnowledgeProfile, KnowledgeRepositoryError>;
  readonly recordGaps: (gaps: readonly KnowledgeGap[]) => Effect.Effect<KnowledgeProfile, KnowledgeRepositoryError>;
  readonly updateGapStatus: (id: string, status: KnowledgeGapStatus) => Effect.Effect<KnowledgeGap, GapNotFound | KnowledgeRepositoryError>;
  readonly removeGapsByArtifactId: (artifactId: string) => Effect.Effect<void, KnowledgeRepositoryError>;
  readonly clearProfile: () => Effect.Effect<void, KnowledgeRepositoryError>;
  readonly listActiveGaps: () => Effect.Effect<readonly KnowledgeGap[], KnowledgeRepositoryError>;
}

export const KnowledgeRepository = Context.Service<KnowledgeRepository>(
  "@proxus/server/knowledge/KnowledgeRepository"
);
