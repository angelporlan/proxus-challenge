import { useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useState } from "react";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { deleteMaterialAction, materialsQuery } from "../domain/materials/atoms.ts";
import { DocumentUploadModal } from "./DocumentUploadModal.tsx";

interface SidebarProps {
  readonly selectedArtifactId: string | null;
  readonly onSelectArtifact: (artifactId: string) => void;
  readonly selectedMaterialId?: string | null | undefined;
  readonly onSelectMaterial?: ((materialId: string) => void) | undefined;
  readonly onAskTutor?: ((prompt: string) => void) | undefined;
  readonly theme?: "dark" | "light" | undefined;
  readonly onToggleTheme?: (() => void) | undefined;
}

export function Sidebar({
  selectedArtifactId,
  onSelectArtifact,
  selectedMaterialId,
  onSelectMaterial,
  onAskTutor,
  theme = "dark",
  onToggleTheme
}: SidebarProps) {
  const materials = useAtomValue(materialsQuery);
  const artifacts = useAtomValue(artifactsQuery);
  const deleteMaterial = useAtomSet(deleteMaterialAction, { mode: "promise" });
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isLight = theme === "light";

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${title}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteMaterial(id);
    } catch (cause) {
      alert(`Error al eliminar material: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <aside
        className={`h-screen overflow-y-auto border-r p-4 sm:p-5 flex flex-col justify-between max-md:h-auto max-md:max-h-[50vh] max-md:border-r-0 max-md:border-b transition-colors ${
          isLight
            ? "border-slate-200 bg-white text-slate-900"
            : "border-slate-800/80 bg-[#090d16] text-slate-100"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 font-extrabold text-white shadow-lg shadow-indigo-600/30">
                <span className="material-symbols-outlined text-xl">auto_stories</span>
              </div>
              <div>
                <strong
                  className={`block font-display text-base font-bold tracking-tight ${
                    isLight ? "text-slate-900" : "text-slate-100"
                  }`}
                >
                  PROXUS AI
                </strong>
                <span className={`block text-xs font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  Tutor Académico
                </span>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online</span>
            </span>
          </div>

          {/* Section 1: Materials (PDFs) */}
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-indigo-500">menu_book</span>
                <h2
                  className={`font-semibold text-xs uppercase tracking-wider font-mono ${
                    isLight ? "text-slate-600" : "text-slate-300"
                  }`}
                >
                  Materiales PDF
                </h2>
              </div>
              <button
                className="flex items-center gap-1 rounded-xl bg-indigo-600 px-2.5 py-1 font-semibold text-xs text-white hover:bg-indigo-500 transition shadow-sm shadow-indigo-600/20"
                type="button"
                onClick={() => setIsUploadOpen(true)}
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span>Subir</span>
              </button>
            </div>

            {AsyncResult.matchWithError(materials, {
              onInitial: () => <p className="text-slate-400 text-xs">Cargando apuntes…</p>,
              onError: (error) => <p className="text-red-400 text-xs">{String(error)}</p>,
              onDefect: (defect) => <p className="text-red-400 text-xs">{String(defect)}</p>,
              onSuccess: ({ value }) =>
                value.materials.length === 0 ? (
                  <div
                    className={`rounded-2xl border border-dashed p-4 text-center ${
                      isLight
                        ? "border-slate-300 bg-slate-50 text-slate-500"
                        : "border-slate-800 bg-slate-900/40 text-slate-500"
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl text-slate-400 mb-1">
                      upload_file
                    </span>
                    <p className="text-xs">No hay PDFs subidos.</p>
                    <button
                      type="button"
                      onClick={() => setIsUploadOpen(true)}
                      className="mt-2 text-xs font-semibold text-indigo-500 hover:underline"
                    >
                      Subir mi primer PDF
                    </button>
                  </div>
                ) : (
                  <ul className="grid gap-2">
                    {value.materials.map((material) => {
                      const isSelected = selectedMaterialId === material.id;
                      return (
                        <li
                          key={material.id}
                          className={`rounded-2xl border p-3 transition flex flex-col gap-2 ${
                            isSelected
                              ? isLight
                                ? "border-indigo-500 bg-indigo-50/60 shadow-sm"
                                : "border-indigo-500 bg-indigo-950/40 shadow-sm"
                              : isLight
                              ? "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white"
                              : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <strong
                                className={`block text-xs font-semibold truncate ${
                                  isLight ? "text-slate-800" : "text-slate-100"
                                }`}
                              >
                                {material.title}
                              </strong>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {material.pageCount} págs · {material.fileName}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDelete(material.id, material.title)}
                              disabled={deletingId === material.id}
                              className="text-slate-400 hover:text-red-400 p-1 transition disabled:opacity-50"
                              title="Eliminar PDF"
                            >
                              <span className="material-symbols-outlined text-xs">
                                {deletingId === material.id ? "hourglass_empty" : "delete"}
                              </span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/50 text-[11px] font-medium">
                            <button
                              type="button"
                              className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
                              onClick={() => onSelectMaterial?.(material.id)}
                            >
                              <span className="material-symbols-outlined text-xs">visibility</span>
                              <span>Ver PDF</span>
                            </button>

                            {onAskTutor && (
                              <button
                                type="button"
                                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                onClick={() =>
                                  onAskTutor(
                                    `Explica los conceptos principales de los apuntes "${material.title}" (${material.id})`
                                  )
                                }
                              >
                                <span className="material-symbols-outlined text-xs">chat</span>
                                <span>Consultar</span>
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )
            })}
          </section>

          {/* Section 2: Artifacts (Notes, Quizzes, Tests) */}
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-indigo-500">school</span>
                <h2
                  className={`font-semibold text-xs uppercase tracking-wider font-mono ${
                    isLight ? "text-slate-600" : "text-slate-300"
                  }`}
                >
                  Recursos de Estudio
                </h2>
              </div>
            </div>

            {AsyncResult.matchWithError(artifacts, {
              onInitial: () => <p className="text-slate-400 text-xs">Cargando recursos…</p>,
              onError: (error) => <p className="text-red-400 text-xs">{String(error)}</p>,
              onDefect: (defect) => <p className="text-red-400 text-xs">{String(defect)}</p>,
              onSuccess: ({ value }) =>
                value.artifacts.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">
                    Pide al tutor generar una nota, quiz o simulacro de examen.
                  </p>
                ) : (
                  <ul className="grid gap-2">
                    {value.artifacts.map((artifact) => {
                      const isSelected = selectedArtifactId === artifact.id;
                      const iconName =
                        artifact.kind === "note"
                          ? "description"
                          : artifact.kind === "quiz"
                          ? "quiz"
                          : "timer";

                      const badgeStyle =
                        artifact.kind === "note"
                          ? isLight
                            ? "bg-sky-100 text-sky-700 border-sky-300"
                            : "bg-sky-950/80 text-sky-300 border-sky-800/40"
                          : artifact.kind === "quiz"
                          ? isLight
                            ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                            : "bg-indigo-950/80 text-indigo-300 border-indigo-800/40"
                          : isLight
                          ? "bg-purple-100 text-purple-700 border-purple-300"
                          : "bg-purple-950/80 text-purple-300 border-purple-800/40";

                      return (
                        <li key={artifact.id}>
                          <button
                            className={`w-full rounded-2xl p-3 text-left transition border ${
                              isSelected
                                ? isLight
                                  ? "border-indigo-500 bg-indigo-50/70 shadow-sm"
                                  : "border-indigo-500 bg-indigo-950/40 shadow-sm"
                                : isLight
                                ? "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white"
                                : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                            }`}
                            type="button"
                            onClick={() => onSelectArtifact(artifact.id)}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span
                                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${badgeStyle}`}
                              >
                                <span className="material-symbols-outlined text-[11px]">{iconName}</span>
                                <span>{artifact.kind}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">{artifact.id}</span>
                            </div>
                            <strong
                              className={`block text-xs truncate mt-1 ${
                                isLight ? "text-slate-800" : "text-slate-100"
                              }`}
                            >
                              {artifact.title}
                            </strong>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )
            })}
          </section>
        </div>

        {/* Footer info & Theme Toggle */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between gap-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isLight
                  ? "border-slate-300 bg-slate-100 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 shadow-sm"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:border-indigo-500 hover:text-white"
              }`}
              title={isLight ? "Cambiar a Modo Oscuro" : "Cambiar a Modo Claro"}
            >
              <span className="material-symbols-outlined text-sm">
                {isLight ? "dark_mode" : "light_mode"}
              </span>
              <span>{isLight ? "Modo Oscuro" : "Modo Claro"}</span>
            </button>
          )}

          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
            <span>Proxus v2.0</span>
          </div>
        </div>
      </aside>

      <DocumentUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}
