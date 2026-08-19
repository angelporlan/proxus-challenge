import { useAtomSet } from "@effect/atom-react";
import type { PdfMaterial } from "@proxus/shared";
import { type DragEvent, useRef, useState } from "react";
import { uploadMaterialAction } from "../domain/materials/atoms.ts";

interface DocumentUploadModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onUploaded?: (material: PdfMaterial) => void;
}

export function DocumentUploadModal({ isOpen, onClose, onUploaded }: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMaterial = useAtomSet(uploadMaterialAction, { mode: "promise" });

  if (!isOpen) {
    return null;
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0 && droppedFiles[0]) {
      selectFile(droppedFiles[0]);
    }
  };

  const selectFile = (selected: File) => {
    if (!selected.name.toLowerCase().endsWith(".pdf") && selected.type !== "application/pdf") {
      setError("Please select a PDF document (.pdf)");
      return;
    }
    setError(null);
    setFile(selected);
    const defaultTitle = selected.name.replace(/\.[^/.]+$/, "");
    setTitle((current) => (current.trim().length === 0 ? defaultTitle : current));
  };

  const readFileAsBase64 = (fileToRead: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          resolve(result);
        } else {
          reject(new Error("Failed to read file as base64 string"));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error("File reading error"));
      reader.readAsDataURL(fileToRead);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || isUploading) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const base64Data = await readFileAsBase64(file);
      const result = await uploadMaterial({
        fileName: file.name,
        contentBase64: base64Data,
        title: title.trim().length > 0 ? title.trim() : undefined
      });

      setFile(null);
      setTitle("");
      onUploaded?.(result);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50 max-sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-bold text-sky-400 text-xs uppercase tracking-widest">Document Ingestion</p>
            <h2 className="text-xl font-bold text-slate-100">Upload Study Material</h2>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
              isDragging
                ? "border-sky-400 bg-sky-950/20"
                : file
                  ? "border-emerald-500/50 bg-emerald-950/10"
                  : "border-slate-700 bg-slate-950/60 hover:border-slate-500 hover:bg-slate-950"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0 && files[0]) {
                  selectFile(files[0]);
                }
              }}
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="grid size-12 place-items-center rounded-full bg-emerald-950 text-emerald-300 font-bold text-xl">
                  ✓
                </div>
                <div>
                  <strong className="block text-slate-100">{file.name}</strong>
                  <span className="text-slate-400 text-sm">{formatFileSize(file.size)} · Click to change file</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="grid size-12 place-items-center rounded-full bg-slate-800 text-sky-400 font-bold text-2xl">
                  ↑
                </div>
                <div>
                  <p className="font-semibold text-slate-200">
                    Drag & drop your PDF notes or syllabus here
                  </p>
                  <p className="mt-1 text-slate-400 text-xs">
                    or click to browse from your device
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-300 text-sm" htmlFor="material-title">
              Document Title (Optional)
            </label>
            <input
              id="material-title"
              type="text"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Tema 1: Introducción a la Estadística"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 text-sm hover:border-slate-500 hover:text-slate-100"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-sky-400 px-5 py-2 font-semibold text-slate-950 text-sm hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!file || isUploading}
            >
              {isUploading ? "Uploading & Processing…" : "Upload Material"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
