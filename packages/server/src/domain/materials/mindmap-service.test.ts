import { describe, expect, it } from "vitest";
import { normalizeMindMapResponse, selectMindMapPages } from "./mindmap-service.ts";

describe("normalizeMindMapResponse", () => {
  it("fills missing child ids before validating the persisted tree", () => {
    const mindMap = normalizeMindMapResponse({
      id: "root",
      label: "Documento",
      children: [
        { id: "section-1", label: "Sección 1", children: [{ label: "Concepto sin id" }] },
        { label: "Sección sin id", children: [{ children: [{ label: "Subconcepto sin id" }] }] }
      ]
    }, "Documento de prueba");

    const ids: string[] = [];
    const visit = (node: typeof mindMap) => {
      ids.push(node.id);
      for (const child of node.children ?? []) visit(child);
    };
    visit(mindMap);

    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(mindMap.children?.[1]?.children?.[0]?.label).toBe("Concepto 1");
  });

  it("caps long documents to a representative page extract", () => {
    const pages = Array.from({ length: 40 }, (_, index) => ({
      page: index + 1,
      text: `Texto de la página ${index + 1} ${"x".repeat(3000)}`
    }));

    const extract = selectMindMapPages(pages);
    expect(extract.length).toBeLessThanOrEqual(12);
    expect(extract[0]?.page).toBe(1);
    expect(extract.every((page) => page.text.length <= 1800)).toBe(true);
    expect(extract.some((page) => page.page > 8)).toBe(true);
  });
});
