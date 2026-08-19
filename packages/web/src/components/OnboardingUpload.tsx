import { useAtomSet } from "@effect/atom-react";
import type { PdfMaterial } from "@proxus/shared";
import { useState, type DragEvent, type ChangeEvent } from "react";
import { uploadMaterialAction } from "../domain/materials/atoms.ts";

interface OnboardingUploadProps {
  readonly onUploaded?: ((material: PdfMaterial) => void) | undefined;
  readonly onSelectPrompt?: ((prompt: string) => void) | undefined;
  readonly isCompact?: boolean | undefined;
}

export function OnboardingUpload({
  onUploaded,
  onSelectPrompt,
  isCompact = false
}: OnboardingUploadProps) {
  const uploadMaterial = useAtomSet(uploadMaterialAction, { mode: "promise" });
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploaded, setLastUploaded] = useState<PdfMaterial | null>(null);

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Por favor selecciona un archivo en formato PDF (.pdf)");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const base64 = await fileToBase64(file);
      const title = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

      const result = await uploadMaterial({
        fileName: file.name,
        title,
        contentBase64: base64
      });

      setLastUploaded(result);
      if (onUploaded) {
        onUploaded(result);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error al procesar y subir el archivo PDF.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0]) {
      void processFile(files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]) {
      void processFile(files[0]);
    }
  };

  if (isCompact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
          isDragging
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 scale-[0.99]"
            : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white/70 dark:bg-slate-900/40"
        }`}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          disabled={isUploading}
          className="absolute inset-0 z-10 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          title="Subir PDF"
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 transition">
            <span className="material-symbols-outlined text-xl">
              {isUploading ? "hourglass_empty" : "upload_file"}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {isUploading ? "Subiendo…" : "Arrastra un PDF aquí"}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">o pulsa para explorar</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-10 flex flex-col items-center justify-center min-h-full text-center">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium mb-6">
        <span className="material-symbols-outlined text-sm">auto_stories</span>
        <span>Cognitive Flow Study Workspace</span>
      </div>

      <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
        Sube tus apuntes o temario
      </h2>
      <p className="text-slate-600 dark:text-slate-400 text-base max-w-lg mb-8 leading-relaxed">
        El tutor académico analizará tu documento PDF, extraerá las páginas y creará resúmenes, quizzes y simulacros a medida.
      </p>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full relative group rounded-3xl border-2 border-dashed p-10 transition-all cursor-pointer ${
          isDragging
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 scale-[1.01]"
            : "border-slate-300 dark:border-slate-800 hover:border-indigo-400 bg-white/80 dark:bg-slate-900/40 hover:bg-indigo-50/20 shadow-sm"
        }`}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          disabled={isUploading}
          className="absolute inset-0 z-10 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          title="Seleccionar PDF"
        />

        <div className="flex flex-col items-center gap-4">
          <div className="grid size-16 place-items-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 group-hover:scale-110 transition duration-200">
            <span className="material-symbols-outlined text-3xl">cloud_upload</span>
          </div>

          {isUploading ? (
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="size-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Procesando y validando PDF…</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Extrayendo páginas con Poppler y preparando el tutor</p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-200 text-lg mb-1">
                Arrastra tu PDF aquí o <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-4">explora tus archivos</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Soporta PDFs académicos, apuntes, presentaciones o temarios
              </p>
            </div>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="mt-4 w-full p-4 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 text-sm flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <span>{uploadError}</span>
        </div>
      )}

      {lastUploaded && (
        <div className="mt-6 w-full p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 text-left flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">check_circle</span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{lastUploaded.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{lastUploaded.pageCount} páginas procesadas</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full font-medium">
            Listo para estudiar
          </span>
        </div>
      )}

      {/* Quick Prompts */}
      <div className="mt-10 w-full text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          ¿Qué puedes hacer con tu tutor?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              icon: "quiz",
              title: "Generar Quiz de práctica",
              desc: "Preguntas de opción múltiple y verdadero/falso",
              prompt: "Crea un quiz de 3 preguntas de opción múltiple basado en mis materiales."
            },
            {
              icon: "timer",
              title: "Simulacro de Examen",
              desc: "Ponte a prueba con temporizador y puntuación",
              prompt: "Crea un test de examen con 3 preguntas sobre el temario principal."
            },
            {
              icon: "summarize",
              title: "Resumen estructurado",
              desc: "Notas con conceptos clave y fórmulas",
              prompt: "Crea una nota de estudio estructurada resumiendo los conceptos clave de mis materiales."
            },
            {
              icon: "psychology",
              title: "Tutoría socrática",
              desc: "Aprende paso a paso con preguntas guiadas",
              prompt: "Explícame el concepto más importante de mis notas de forma socrática, haciéndome preguntas para razonarlo."
            }
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt && onSelectPrompt(item.prompt)}
              className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-400 text-left transition group shadow-sm"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-600/20 group-hover:text-indigo-600 transition">
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                  {item.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] ?? "" : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
