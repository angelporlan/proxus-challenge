import { useAtomSet } from "@effect/atom-react";
import type { PdfMaterial } from "@proxus/shared";
import { useState, type DragEvent, type ChangeEvent } from "react";
import { uploadMaterialAction } from "../domain/materials/atoms.ts";

interface OnboardingUploadProps {
  readonly onUploaded?: (material: PdfMaterial) => void;
  readonly onSelectPrompt?: (prompt: string) => void;
  readonly isCompact?: boolean;
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
            ? "border-indigo-500 bg-indigo-950/30 scale-[0.99]"
            : "border-slate-800 hover:border-slate-700 bg-slate-900/40"
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
          <div className="grid size-9 place-items-center rounded-xl bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600/30 transition">
            <span className="material-symbols-outlined text-lg">upload_file</span>
          </div>
          <div>
            <p className="font-semibold text-xs text-slate-200">
              {isUploading ? "Procesando PDF…" : "Subir nuevo PDF"}
            </p>
            <p className="text-[11px] text-slate-400">Arrastra o haz clic</p>
          </div>
        </div>
        {uploadError && (
          <p className="mt-2 text-red-400 text-[11px]">{uploadError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 max-w-2xl mx-auto text-center">
      {/* Icon Header */}
      <div className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xl shadow-indigo-600/20 mb-6">
        <span className="material-symbols-outlined text-3xl">auto_stories</span>
      </div>

      <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-100 mb-3 tracking-tight">
        Sube tus apuntes o temario
      </h2>
      <p className="text-slate-400 text-base max-w-lg mb-8 leading-relaxed">
        El tutor académico analizará tu documento PDF, extraerá las páginas y creará resúmenes, quizzes y simulacros a medida.
      </p>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full relative group rounded-3xl border-2 border-dashed p-10 transition-all cursor-pointer ${
          isDragging
            ? "border-indigo-500 bg-indigo-950/40 scale-[1.01]"
            : "border-slate-800 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-slate-900/60"
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
          <div className="grid size-16 place-items-center rounded-2xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 group-hover:scale-110 transition duration-200">
            <span className="material-symbols-outlined text-3xl">cloud_upload</span>
          </div>

          {isUploading ? (
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="size-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent"></div>
                <p className="font-semibold text-slate-200">Procesando y validando PDF…</p>
              </div>
              <p className="text-xs text-slate-400">Extrayendo páginas con Poppler y preparando el tutor</p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-slate-200 text-lg mb-1">
                Arrastra tu PDF aquí o <span className="text-indigo-400 underline underline-offset-4">explora tus archivos</span>
              </p>
              <p className="text-xs text-slate-400">
                Soporta PDFs académicos, apuntes, presentaciones o temarios
              </p>
            </div>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="mt-4 w-full p-4 rounded-2xl border border-red-900/60 bg-red-950/40 text-red-200 text-sm flex items-center gap-3">
          <span className="material-symbols-outlined text-red-400">error</span>
          <span>{uploadError}</span>
        </div>
      )}

      {lastUploaded && (
        <div className="mt-6 w-full p-5 rounded-2xl border border-emerald-800/50 bg-emerald-950/30 text-left flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-400 text-2xl">check_circle</span>
            <div>
              <p className="font-semibold text-slate-100 text-sm">{lastUploaded.title}</p>
              <p className="text-xs text-slate-400">{lastUploaded.pageCount} páginas procesadas</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-medium">
            Listo para estudiar
          </span>
        </div>
      )}

      {/* Quick Prompts */}
      <div className="mt-10 w-full text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
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
              className="flex items-start gap-3 p-4 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-indigo-500/40 text-left transition group"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-800 text-indigo-400 group-hover:bg-indigo-600/20 group-hover:text-indigo-300 transition">
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
              </div>
              <div>
                <p className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300 transition">
                  {item.title}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
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
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
