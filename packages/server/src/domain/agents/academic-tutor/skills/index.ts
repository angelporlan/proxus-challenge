export { UseUploadedMaterialsSkill } from "./use-uploaded-materials.ts";
export { CreateStudyArtifactsSkill } from "./create-study-artifacts.ts";
export { ReviewKnowledgeGapsSkill } from "./review-knowledge-gaps.ts";
export { SearchMaterialsSkill } from "./search-materials.ts";

import { UseUploadedMaterialsSkill } from "./use-uploaded-materials.ts";
import { CreateStudyArtifactsSkill } from "./create-study-artifacts.ts";
import { ReviewKnowledgeGapsSkill } from "./review-knowledge-gaps.ts";
import { SearchMaterialsSkill } from "./search-materials.ts";

export const AcademicTutorSkills = [
  UseUploadedMaterialsSkill,
  SearchMaterialsSkill,
  CreateStudyArtifactsSkill,
  ReviewKnowledgeGapsSkill
] as const;
