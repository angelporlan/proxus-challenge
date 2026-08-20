import { describe, expect, it } from "vitest";
import { getDeletedMaterialNavigation } from "./App.tsx";

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
