import type { PdfMaterial } from "@proxus/shared";
import { PdfUploadDropzone } from "./upload/PdfUploadDropzone.tsx";
import { usePdfUpload } from "./upload/usePdfUpload.ts";

interface OnboardingUploadProps {
  readonly onUploaded?: ((material: PdfMaterial) => void) | undefined;
  readonly onSelectPrompt?: ((prompt: string) => void) | undefined;
  readonly isCompact?: boolean | undefined;
}

const quickPrompts = [
  {
    icon: "quiz",
    title: "Generar quiz de práctica",
    description: "Preguntas de opción múltiple y verdadero o falso",
    prompt: "Crea un quiz de 3 preguntas de opción múltiple basado en mis materiales."
  },
  {
    icon: "timer",
    title: "Simulacro de examen",
    description: "Practica con tiempo y recibe una puntuación",
    prompt: "Crea un test de examen con 3 preguntas sobre el temario principal."
  },
  {
    icon: "summarize",
    title: "Resumen estructurado",
    description: "Repasa conceptos clave, ejemplos y fórmulas",
    prompt: "Crea una nota de estudio estructurada resumiendo los conceptos clave de mis materiales."
  },
  {
    icon: "psychology",
    title: "Tutoría socrática",
    description: "Avanza paso a paso con preguntas guiadas",
    prompt: "Explícame el concepto más importante de mis notas de forma socrática, haciéndome preguntas para razonarlo."
  }
] as const;

export function OnboardingUpload({
  onUploaded,
  onSelectPrompt,
  isCompact = false
}: OnboardingUploadProps) {
  const {
    file,
    title,
    setTitle,
    phase,
    error,
    uploadedMaterial,
    isBusy,
    selectFile,
    removeFile,
    upload
  } = usePdfUpload({ onUploaded });

  const uploadLabel = phase === "reading"
    ? "Leyendo PDF…"
    : phase === "processing"
      ? "Procesando PDF…"
      : phase === "error"
        ? "Reintentar subida"
        : "Subir PDF";

  if (isCompact) {
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void upload();
        }}
      >
        <PdfUploadDropzone
          file={file}
          phase={phase}
          error={error}
          disabled={isBusy}
          compact
          onFileSelect={selectFile}
          onRemove={removeFile}
        />
        {file !== null && phase !== "success" && (
          <button
            type="submit"
            disabled={isBusy}
            className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadLabel}
          </button>
        )}
      </form>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center p-6 text-center sm:p-10">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300">
        <span className="material-symbols-outlined text-sm" aria-hidden="true">auto_stories</span>
        <span>Tu espacio de estudio</span>
      </div>

      <h2 className="mb-3 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
        Añade tus apuntes
      </h2>
      <p className="mb-8 max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-400">
        Sube un PDF para consultarlo, preparar resúmenes y crear ejercicios basados en tu temario.
      </p>

      <form
        className="w-full rounded-xl border border-slate-200 bg-white/70 p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900/35 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void upload();
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
          <div className="mt-4">
            <label
              htmlFor="onboarding-upload-title"
              className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Título del material
            </label>
            <input
              id="onboarding-upload-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              disabled={isBusy || phase === "success"}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              placeholder="Por ejemplo: Tema 1 · Introducción"
            />
          </div>
        )}

        {file !== null && phase !== "success" && (
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy && (
                <span
                  className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden="true"
                />
              )}
              {uploadLabel}
            </button>
          </div>
        )}
      </form>

      {uploadedMaterial !== null && (
        <div
          className="mt-5 flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200"
          role="status"
          aria-live="polite"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">check_circle</span>
          <div>
            <p className="text-sm font-semibold">{uploadedMaterial.title}</p>
            <p className="text-xs opacity-80">
              {uploadedMaterial.pageCount} {uploadedMaterial.pageCount === 1 ? "página preparada" : "páginas preparadas"}
            </p>
          </div>
        </div>
      )}

      <div className="mt-10 w-full text-left">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Ideas para empezar
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickPrompts.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => onSelectPrompt?.(item.prompt)}
              className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 text-left shadow-sm transition-colors hover:border-indigo-400 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-indigo-600 transition-colors group-hover:bg-indigo-50 dark:bg-slate-800 dark:text-indigo-400 dark:group-hover:bg-indigo-600/20" aria-hidden="true">
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
              </span>
              <span>
                <strong className="block text-xs font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-300">
                  {item.title}
                </strong>
                <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                  {item.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
