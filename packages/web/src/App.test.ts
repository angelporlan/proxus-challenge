import { describe, expect, it } from "vitest";
import { getDeletedMaterialNavigation } from "./App.tsx";
import {
  applyAtomicMentionDeletion,
  attachedDocsAfterTextChange,
  findMentionRanges,
  mentionQueryAtCursor,
  splitMentionParts
} from "./hooks/useMentions.ts";

describe("material deletion navigation", () => {
  it("clears the selected PDF and returns to Estudio when that PDF is deleted", () => {
    expect(getDeletedMaterialNavigation("material-1", "material-1")).toEqual({
      selectedMaterialId: null,
      pdfPage: 1,
      activeTab: "workspace"
    });
  });

  it("keeps the current workspace when another PDF is deleted", () => {
    expect(getDeletedMaterialNavigation("material-1", "material-2")).toBeNull();
  });
});

describe("Chat mention utilities", () => {
  const materials = [
    { id: "doc-1", title: "document-1" },
    { id: "doc-2", title: "Constitución Española" }
  ];

  it("finds mention ranges accurately for single and multi-word document titles", () => {
    const text = "@document-1 Explícame esto y luego @Constitución Española por favor";
    const ranges = findMentionRanges(text, materials);

    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toEqual({
      start: 0,
      end: 11,
      token: "@document-1",
      title: "document-1",
      materialId: "doc-1"
    });
    expect(ranges[1]).toEqual({
      start: 35,
      end: 57,
      token: "@Constitución Española",
      title: "Constitución Española",
      materialId: "doc-2"
    });
  });

  it("splits text into text and mention segments", () => {
    const text = "@document-1 ¿De qué trata?";
    const parts = splitMentionParts(text, materials);

    expect(parts).toEqual([
      { kind: "mention", value: "@document-1" },
      { kind: "text", value: " ¿De qué trata?" }
    ]);
  });
});

describe("mention editor helpers", () => {
  const materials = [{ id: "doc-1", title: "Tema 4" }];

  it("detects an in-progress @query at the cursor", () => {
    expect(mentionQueryAtCursor("lee @tem", 8)).toBe("tem");
    expect(mentionQueryAtCursor("lee tema", 8)).toBeNull();
  });

  it("deletes a mention atomically with Backspace", () => {
    const result = applyAtomicMentionDeletion("Backspace", "Lee @Tema 4 ahora", 11, 11, materials);
    expect(result).not.toBeNull();
    expect(result?.nextInput).toBe("Lee ahora");
    expect(result?.removed[0]?.title).toBe("Tema 4");
  });

  it("drops attached docs whose mention was removed from the text", () => {
    const next = attachedDocsAfterTextChange(
      "Lee @Tema 4",
      "Lee ",
      [{ id: "doc-1", title: "Tema 4" }],
      materials
    );
    expect(next).toEqual([]);
  });
});

