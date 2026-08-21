import { HttpApi, OpenApi } from "effect/unstable/httpapi";
import { ArtifactsApi } from "./artifacts.ts";
import { KnowledgeApi } from "./knowledge.ts";
import { MaterialsApi } from "./materials.ts";
import { TutorApi } from "./tutor.ts";

export class ProxusApi extends HttpApi.make("proxus-api")
  .add(TutorApi)
  .add(MaterialsApi)
  .add(ArtifactsApi)
  .add(KnowledgeApi)
  .prefix("/api")
  .annotateMerge(OpenApi.annotations({
    title: "Proxus API"
  }))
{}
