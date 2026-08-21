import { AgentSkill } from "../../harness/index.ts";

export const SearchMaterialsSkill = AgentSkill.make({
  name: "search-materials",
  description: "Search text across uploaded PDF materials to find exact relevant pages and excerpts before rendering images.",
  content: [
    "# Search materials",
    "",
    "Use this skill when:",
    "- The student asks a specific factual, legal, or conceptual question across large PDF documents.",
    "- You need to quickly identify which page contains an article, keyword, or theorem without guessing.",
    "",
    "Available CLI commands:",
    "- `materials search <materialId> <query>`: search text across all pages of a material and return ranked pages with matching snippets.",
    "",
    "Workflow:",
    "1. When the student asks about a specific term or article (e.g. 'Habeas Corpus', 'Art. 17', 'prescripción'), call `materials search <materialId> <query>`.",
    "2. Review the matched page numbers and text snippets.",
    "3. Use `materials view <materialId> <page>` only on the top 1-2 relevant pages to inspect full definitions or diagrams.",
    "4. Formulate your final answer citing the exact page numbers discovered."
  ].join("\n")
});
