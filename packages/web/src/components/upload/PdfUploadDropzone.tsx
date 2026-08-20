import { type DragEvent, useId, useRef, useState } from "react";
import type { UploadPhase } from "./usePdfUpload.ts";

interface PdfUploadDropzoneProps {
  readonly file: File | null;
  readonly phase: UploadPhase;
  readonly error?: string | null | undefined;
  readonly disabled?: boolean | undefined;
  readonly compact?: boolean | undefined;
  readonly onFileSelect: (file: File) => void;
  readonly onRemove?: (() => void) | undefined;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const phaseLabel = (phase: UploadPhase) => {
  switch (phase) {
    case "reading":
      return "Leyendo el archivo…";
    case "processing":
      return "Procesando PDF…";
    case "success":
      return "PDF listo para estudiar";
    case "error":
      return "Revisa el archivo e inténtalo de nuevo";
    case "idle":
      return "Listo para subir";
  }
};

export function PdfUploadDropzone({
  file,
  phase,
  error,
  disabled = false,
  compact = false,
  onFileSelect,
  onRemove
}: PdfUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const descriptionId = useId();
  const errorId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);

    if (disabled) {
      return;
    }

    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile !== undefined) {
      onFileSelect(droppedFile);
    }
  };

  const isBusy = phase === "reading" || phase === "processing";

  return (
    <div>
      <div
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-colors duration-200 ${
          compact ? "p-4" : "p-6 sm:p-8"
        } ${
          isDragging
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
            : phase === "success"
              ? "border-emerald-400 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-950/25"
              : error
                ? "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                : "border-slate-300 bg-slate-50/70 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-indigo-500"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) {
            dragDepthRef.current += 1;
            setIsDragging(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) {
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
        aria-busy={isBusy}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          tabIndex={-1}
          disabled={disabled}
          aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
          onChange={(event) => {
            const selectedFile = event.currentTarget.files?.[0];
            if (selectedFile !== undefined) {
              onFileSelect(selectedFile);
            }
            event.currentTarget.value = "";
          }}
        />

        {file === null ? (
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled}
            className="group flex w-full flex-col items-center justify-center gap-3 text-center disabled:cursor-not-allowed disabled:opacity-60"
            aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
          >
            <span
              className={`grid place-items-center rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-600 transition-transform duration-200 group-hover:scale-105 dark:border-indigo-800/60 dark:bg-indigo-950/60 dark:text-indigo-300 ${
                compact ? "size-10" : "size-14"
              }`}
              aria-hidden="true"
            >
              <span className={`material-symbols-outlined ${compact ? "text-xl" : "text-3xl"}`}>
                upload_file
              </span>
            </span>
            <span>
              <strong className={`block text-slate-900 dark:text-slate-100 ${compact ? "text-sm" : "text-base"}`}>
                {isDragging ? "Suelta el PDF para añadirlo" : "Arrastra un PDF aquí o selecciónalo"}
              </strong>
              <span id={descriptionId} className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                Podrás revisar el nombre antes de subirlo.
              </span>
            </span>
          </button>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span
                className={`grid shrink-0 place-items-center rounded-xl ${
                  phase === "success"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : phase === "error"
                      ? "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300"
                      : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300"
                } ${compact ? "size-9" : "size-11"}`}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-xl">
                  {phase === "success" ? "check_circle" : "picture_as_pdf"}
                </span>
              </span>

              <div className="min-w-0 flex-1 text-left">
                <strong className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {file.name}
                </strong>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                  {formatFileSize(file.size)}
                </span>
                <span
                  id={descriptionId}
                  className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${
                    phase === "success"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {isBusy && (
                    <span
                      className="size-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
                      aria-hidden="true"
                    />
                  )}
                  {phaseLabel(phase)}
                </span>
              </div>

              {!isBusy && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={openPicker}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-950"
                  >
                    Reemplazar
                  </button>
                  {onRemove !== undefined && (
                    <button
                      type="button"
                      onClick={onRemove}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
        >
          <span className="material-symbols-outlined mt-0.5 text-base" aria-hidden="true">error</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
