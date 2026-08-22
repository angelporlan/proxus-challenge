import { Effect, Layer } from "effect";
import * as AgentCli from "../harness/index.ts";
import {
  InvalidPageRange,
  MaterialNotFound,
  MaterialRepository,
  parsePageSelection,
  type MaterialRepository as MaterialRepositoryType
} from "../../materials/material.ts";
import { ArtifactRepository, type ArtifactRepository as ArtifactRepositoryType } from "../../artifacts/artifact.ts";
import { KnowledgeRepository, type KnowledgeRepository as KnowledgeRepositoryType } from "../../knowledge/knowledge-profile.ts";
import { deleteMaterialCascade } from "../../materials/delete-material-cascade.ts";

const renderMaterialError = (error: MaterialNotFound | InvalidPageRange | { readonly _tag: "MaterialRepositoryError"; readonly reason: unknown }) => {
  switch (error._tag) {
    case "MaterialNotFound":
      return `Material not found: ${error.materialId}`;
    case "InvalidPageRange":
      return `Invalid page selection ${JSON.stringify(error.range)}: ${error.reason}`;
    case "MaterialRepositoryError":
      return `Material repository error: ${String(error.reason)}`;
  }
};

export const makeMaterialCommands = (
  repository: MaterialRepositoryType,
  artifactRepository: ArtifactRepositoryType,
  knowledgeRepository?: KnowledgeRepositoryType
) => {
  const list = AgentCli.Command.withExamples([
    { command: "materials list", description: "List all uploaded PDF materials" }
  ])(
    AgentCli.Command.withDescription("List the user's uploaded PDF materials")(
      AgentCli.Command.exec("list", {}, () =>
        repository.list().pipe(
          Effect.map((materials) => {
            if (materials.length === 0) {
              return "No PDF materials found.";
            }

            return materials.map((material) =>
              `- ${material.id}: ${material.title} (${material.pageCount} pages, file: ${material.fileName})`
            ).join("\n");
          }),
          Effect.catch((error) => Effect.succeed(renderMaterialError(error)))
        )
      )
    )
  );

  const search = AgentCli.Command.withExamples([
    { command: "materials search tema-1-constitucion 'habeas corpus'", description: "Search for 'habeas corpus' in document" },
    { command: "materials search tema-1-constitucion 'art 17'", description: "Search for 'art 17' in document" }
  ])(
    AgentCli.Command.withDescription("Search text across all pages of a PDF material to find matching page numbers and excerpts")(
      AgentCli.Command.exec("search", {
        materialId: AgentCli.Argument.string("materialId").pipe(
          AgentCli.Argument.withDescription("Material id from `materials list`")
        ),
        query: AgentCli.Argument.string("query").pipe(
          AgentCli.Argument.withDescription("Text or concept to search for")
        )
      }, ({ materialId, query }) =>
        repository.searchText(materialId, query).pipe(
          Effect.map((results) => {
            if (results.length === 0) {
              return `No text matches found for "${query}" in material "${materialId}".`;
            }

            const topMatches = results.slice(0, 5);
            return `Found ${results.length} matching page(s) for "${query}":\n` +
              topMatches.map((res) => `- Page ${res.page} (score: ${res.score}):\n  "${res.snippet}"`).join("\n");
          }),
          Effect.catch((error) => Effect.succeed(renderMaterialError(error)))
        )
      )
    )
  );

  const view = AgentCli.Command.withExamples([
    { command: "materials view algebra-notes 10", description: "Render page 10 as an image" },
    { command: "materials view algebra-notes 13-20", description: "Render pages 13 through 20 as images" },
    { command: "materials view algebra-notes 10,13-20", description: "Render page 10 and pages 13 through 20" }
  ])(
    AgentCli.Command.withDescription("Render selected PDF pages as PNG images for visual reading")(
      AgentCli.Command.exec("view", {
        materialId: AgentCli.Argument.string("materialId").pipe(
          AgentCli.Argument.withDescription("Material id from `materials list`")
        ),
        pages: AgentCli.Argument.withMetavar("<pages:10,13-20>")(
          AgentCli.Argument.withDescription("Page selection like 10 or 13-20 or 10,13-20")(
            AgentCli.Argument.string("pages")
          )
        )
      }, ({ materialId, pages }) =>
        parsePageSelection(pages).pipe(
          Effect.andThen((parsedPages) => repository.renderPages(materialId, parsedPages)),
          Effect.catch((error) => Effect.succeed(renderMaterialError(error)))
        )
      )
    )
  );

  const remove = AgentCli.Command.withExamples([
    { command: "materials delete algebra-notes", description: "Delete a material by its ID" }
  ])(
    AgentCli.Command.withDescription("Delete a PDF and its related artifacts, mind map, and knowledge gaps")(
      AgentCli.Command.exec("delete", {
        materialId: AgentCli.Argument.string("materialId").pipe(
          AgentCli.Argument.withDescription("Material id from `materials list`")
        )
      }, ({ materialId }) => {
        const cascade = knowledgeRepository !== undefined
          ? deleteMaterialCascade(materialId).pipe(
            Effect.provide(Layer.mergeAll(
              Layer.succeed(MaterialRepository, repository),
              Layer.succeed(ArtifactRepository, artifactRepository),
              Layer.succeed(KnowledgeRepository, knowledgeRepository)
            ))
          )
          : Effect.gen(function* () {
            const related = (yield* artifactRepository.listArtifacts({})).filter(
              (artifact) => artifact.sourceMaterialId === materialId
            );
            yield* Effect.forEach(
              related,
              (artifact) => artifactRepository.deleteArtifact(artifact.id),
              { concurrency: 1 }
            );
            yield* repository.delete(materialId);
            return { success: true as const, id: materialId };
          });

        return cascade.pipe(
          Effect.map(() => `Material deleted: ${materialId}`),
          Effect.catch((error) => Effect.succeed(
            error._tag === "MaterialNotFound" || error._tag === "MaterialRepositoryError"
              ? renderMaterialError(error)
              : `Failed to delete material ${materialId}: ${error._tag}`
          ))
        );
      })
    )
  );

  return AgentCli.Command.group("materials", [list, search, view, remove] as const).pipe(
    AgentCli.Command.withDescription("Uploaded PDF material commands")
  );
};
