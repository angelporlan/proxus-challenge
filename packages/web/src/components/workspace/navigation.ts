export type ActiveTab = "workspace" | "mindmap" | "pdf" | "gaps";

export function getDeletedMaterialNavigation(
  selectedMaterialId: string | null,
  deletedMaterialId: string
) {
  return selectedMaterialId === deletedMaterialId
    ? { selectedMaterialId: null, pdfPage: 1, activeTab: "workspace" as const }
    : null;
}
