import type { PdfMaterial } from "@proxus/shared";
import { useEffect } from "react";
import { Button, Dialog } from "./ui/index.ts";
import { PdfUploadDropzone } from "./upload/PdfUploadDropzone.tsx";
import { usePdfUpload } from "./upload/usePdfUpload.ts";

interface DocumentUploadModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onUploaded?: ((material: PdfMaterial) => void) | undefined;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  onUploaded
}: DocumentUploadModalProps) {
  const {
    file,
    title,
    setTitle,
    phase,
    error,
    isBusy,
    selectFile,
    removeFile,
    upload,
    reset
  } = usePdfUpload({ onUploaded });

  useEffect(() => {
    if (!isOpen && !isBusy) {
      reset();
    }
  }, [isBusy, isOpen, reset]);

  const handleClose = () => {
    if (isBusy) {
      return;
    }

    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const material = await upload();
    if (material !== null) {
      handleClose();
    }
  };

  const submitLabel = phase === "reading"
    ? "Leyendo PDF…"
    : phase === "processing"
      ? "Procesando PDF…"
      : phase === "error"
        ? "Reintentar subida"
        : "Subir PDF";

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title="Subir material"
      description="Añade un PDF y revisa su título antes de incorporarlo a tu espacio de estudio."
      dismissible={!isBusy}
      footer={(
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isBusy}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="document-upload-form"
            disabled={file === null || isBusy}
            loading={isBusy}
          >
            {submitLabel}
          </Button>
        </div>
      )}
    >
      <form
        id="document-upload-form"
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <PdfUploadDropzone
          file={file}
          phase={phase}
          error={error}
          disabled={isBusy}
          onFileSelect={selectFile}
          onRemove={removeFile}
        />

        {file !== null && (
          <div>
            <label
              htmlFor="material-upload-title"
              className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Título del material
            </label>
            <input
              id="material-upload-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              disabled={isBusy}
              placeholder="Por ejemplo: Tema 1 · Introducción"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Puedes editarlo ahora; el nombre del archivo no cambiará.
            </p>
          </div>
        )}
      </form>
    </Dialog>
  );
}
