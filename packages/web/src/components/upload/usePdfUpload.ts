import { useAtomSet } from "@effect/atom-react";
import type { PdfMaterial } from "@proxus/shared";
import { useCallback, useRef, useState } from "react";
import { uploadMaterialAction } from "../../domain/materials/atoms.ts";

export type UploadPhase = "idle" | "reading" | "processing" | "success" | "error";

interface UsePdfUploadOptions {
  readonly onUploaded?: ((material: PdfMaterial) => void) | undefined;
}

const titleFromFileName = (fileName: string) =>
  fileName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();

const isPdf = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("No se pudo leer el archivo seleccionado."));
        return;
      }

      const separatorIndex = reader.result.indexOf(",");
      resolve(separatorIndex >= 0 ? reader.result.slice(separatorIndex + 1) : reader.result);
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("No se pudo leer el archivo seleccionado."));
    };

    reader.readAsDataURL(file);
  });

export function usePdfUpload({ onUploaded }: UsePdfUploadOptions = {}) {
  const uploadMaterial = useAtomSet(uploadMaterialAction, { mode: "promise" });
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadedMaterial, setUploadedMaterial] = useState<PdfMaterial | null>(null);
  const busyRef = useRef(false);

  const isBusy = phase === "reading" || phase === "processing";

  const selectFile = useCallback((selectedFile: File) => {
    if (!isPdf(selectedFile)) {
      setUploadedMaterial(null);
      setError("Selecciona un archivo PDF válido (.pdf).");
      setPhase("error");
      return false;
    }

    setFile(selectedFile);
    setTitle(titleFromFileName(selectedFile.name));
    setUploadedMaterial(null);
    setError(null);
    setPhase("idle");
    return true;
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setTitle("");
    setPhase("idle");
    setError(null);
    setUploadedMaterial(null);
    busyRef.current = false;
  }, []);

  const removeFile = useCallback(() => {
    if (isBusy) {
      return;
    }

    reset();
  }, [isBusy, reset]);

  const upload = useCallback(async (): Promise<PdfMaterial | null> => {
    if (file === null || busyRef.current) {
      if (file === null) {
        setError("Selecciona un PDF antes de continuar.");
        setPhase("error");
      }
      return null;
    }

    setError(null);
    setUploadedMaterial(null);
    setPhase("reading");
    busyRef.current = true;

    let material: PdfMaterial;

    try {
      const contentBase64 = await fileToBase64(file);
      setPhase("processing");

      material = await uploadMaterial({
        fileName: file.name,
        contentBase64,
        title: title.trim().length > 0 ? title.trim() : undefined
      });
    } catch {
      busyRef.current = false;
      setError("No se pudo subir el PDF. Comprueba el archivo e inténtalo de nuevo.");
      setPhase("error");
      return null;
    }

    busyRef.current = false;
    setUploadedMaterial(material);
    setPhase("success");
    onUploaded?.(material);
    return material;
  }, [file, onUploaded, title, uploadMaterial]);

  return {
    file,
    title,
    setTitle,
    phase,
    error,
    uploadedMaterial,
    isBusy,
    selectFile,
    removeFile,
    upload,
    reset
  } as const;
}
