import { HttpApi, OpenApi } from "effect/unstable/httpapi";
import { ArtifactsApi } from "./artifacts.ts";
import { KnowledgeApi } from "./knowledge.ts";
import { MaterialsApi } from "./materials.ts";
import { TutorApi } from "./tutor.ts";
import { UserProfileApi } from "./user-profile.ts";

export class ProxusApi extends HttpApi.make("proxus-api")
  .add(TutorApi)
  .add(MaterialsApi)
  .add(ArtifactsApi)
  .add(KnowledgeApi)
  .add(UserProfileApi)
  .prefix("/api")
  .annotateMerge(OpenApi.annotations({
    title: "Proxus API"
  }))
{}
