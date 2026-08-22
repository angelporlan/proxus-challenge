import type { PdfMaterial } from "@proxus/shared";

export function StudyHome({ recentMaterial, onOpenMaterial, onOpenTutor, onUpload }: {
  readonly recentMaterial: PdfMaterial | null;
  readonly onOpenMaterial: (id: string) => void;
  readonly onOpenTutor: () => void;
  readonly onUpload: () => void;
}) {
  return (
    <main className="flex h-full items-center justify-center overflow-y-auto p-6 sm:p-10">
      <section className="w-full max-w-2xl">
        <p className="mb-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">Espacio de estudio</p>
        <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-4xl">¿Qué quieres repasar hoy?</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">Continúa con tus apuntes o pide al tutor que prepare una explicación, un quiz o una nota de estudio.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {recentMaterial && <button type="button" className="ui-primary-action min-h-10" onClick={() => onOpenMaterial(recentMaterial.id)}><span className="material-symbols-outlined text-[18px]">history</span>Continuar con {recentMaterial.title}</button>}
          <button type="button" className="ui-secondary-action" onClick={onOpenTutor}><span className="material-symbols-outlined text-[18px]">forum</span>Abrir tutor</button>
          <button type="button" className="ui-quiet-action" onClick={onUpload}>Subir otro PDF</button>
        </div>
      </section>
    </main>
  );
}

export function NoPdfSelected({ recentMaterial, onOpenRecent, onUpload }: {
  readonly recentMaterial: PdfMaterial | null;
  readonly onOpenRecent: () => void;
  readonly onUpload: () => void;
}) {
  return (
    <main className="flex h-full items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <span className="material-symbols-outlined mb-3 text-4xl text-slate-400">picture_as_pdf</span>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Selecciona un PDF</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Abre un material de tu biblioteca para consultar sus páginas.</p>
        <div className="mt-5 flex justify-center gap-2">
          {recentMaterial && <button type="button" className="ui-primary-action" onClick={onOpenRecent}>Abrir el más reciente</button>}
          <button type="button" className="ui-secondary-action" onClick={onUpload}>Subir PDF</button>
        </div>
      </div>
    </main>
  );
}
