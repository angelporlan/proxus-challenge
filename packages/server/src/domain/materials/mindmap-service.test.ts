import { describe, expect, it } from "vitest";
import { normalizeMindMapResponse } from "./mindmap-service.ts";

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
});
