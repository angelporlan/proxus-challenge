import { useAtomRefresh, useAtomSet } from "@effect/atom-react";
import { useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { materialsQuery, uploadMaterialAction } from "../domain/materials/atoms.ts";
import type { AttachedDoc } from "./useMentions.ts";

export function useChatPdfUpload({
  setAttachedDocs,
  setError
}: {
  readonly setAttachedDocs: Dispatch<SetStateAction<AttachedDoc[]>>;
  readonly setError: Dispatch<SetStateAction<string | undefined>>;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const refreshMaterials = useAtomRefresh(materialsQuery);
  const uploadMaterial = useAtomSet(uploadMaterialAction, { mode: "promise" });

  const handleDirectFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setIsUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            if (!base64) return;
            const cleanTitle = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
            const res = await uploadMaterial({
              title: cleanTitle,
              fileName: file.name,
              contentBase64: base64
            });
            refreshMaterials();
            if (res && res.id) {
              setAttachedDocs((prev) => [
                ...prev.filter((d) => d.id !== res.id),
                { id: res.id, title: res.title, pageCount: res.pageCount }
              ]);
            }
          } catch (e) {
            console.error("Direct upload failed", e);
            setError("No se pudo subir el documento. Inténtalo de nuevo.");
          } finally {
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Reader error", err);
        setIsUploading(false);
      }
    } else {
      setError("Solo se pueden adjuntar documentos en formato PDF.");
    }
    event.target.value = "";
  };

  return {
    isUploading,
    handleDirectFileUpload
  };
}
