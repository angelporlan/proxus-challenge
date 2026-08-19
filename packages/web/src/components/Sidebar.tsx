import { useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useState } from "react";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { deleteMaterialAction, materialsQuery } from "../domain/materials/atoms.ts";
import { DocumentUploadModal } from "./DocumentUploadModal.tsx";

interface SidebarProps {
  readonly selectedArtifactId: string | null;
  readonly onSelectArtifact: (artifactId: string) => void;
  readonly selectedMaterialId?: string | null;
  readonly onSelectMaterial?: (materialId: string) => void;
  readonly onAskTutor?: (prompt: string) => void;
}

export function Sidebar({
  selectedArtifactId,
  onSelectArtifact,
  selectedMaterialId,
  onSelectMaterial,
  onAskTutor
}: SidebarProps) {
  const materials = useAtomValue(materialsQuery);
  const artifacts = useAtomValue(artifactsQuery);
  const deleteMaterial = useAtomSet(deleteMaterialAction, { mode: "promise" });
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      <aside className="h-screen overflow-y-auto border-slate-800 border-r bg-[#090d16] p-4 sm:p-5 flex flex-col justify-between max-md:h-auto max-md:max-h-[50vh] max-md:border-r-0 max-md:border-b">
        <div>
          {/* Brand Header */}
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 font-extrabold text-white shadow-lg shadow-indigo-600/30">
                <span className="material-symbols-outlined text-xl">auto_stories</span>
              </div>
              <div>
                <strong className="block font-display text-slate-100 text-base font-bold tracking-tight">
                  PROXUS AI
                </strong>
                <span className="block text-slate-400 text-xs font-medium">Tutor Académico</span>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Online</span>
            </span>
          </div>

          {/* Section 1: Materials (PDFs) */}
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-indigo-400">menu_book</span>
                <h2 className="font-semibold text-slate-300 text-xs uppercase tracking-wider font-mono">
                  Materiales PDF
                </h2>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg bg-indigo-600/20 px-2.5 py-1 font-semibold text-indigo-300 text-xs transition hover:bg-indigo-600/30 border border-indigo-500/30"
                onClick={() => setIsUploadOpen(true)}
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span>Subir</span>
              </button>
            </div>

            {AsyncResult.matchWithError(materials, {
              onInitial: () => <p className="text-slate-400 text-xs">Cargando materiales…</p>,
              onError: (error) => <p className="text-red-300 text-xs">{String(error)}</p>,
              onDefect: (defect) => <p className="text-red-300 text-xs">{String(defect)}</p>,
              onSuccess: ({ value }) =>
                value.materials.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-center">
                    <p className="text-slate-400 text-xs">No hay PDFs subidos todavía.</p>
                    <button
                      type="button"
                      className="mt-2.5 inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 font-semibold text-white text-xs transition hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                      onClick={() => setIsUploadOpen(true)}
                    >
                      <span className="material-symbols-outlined text-xs">upload</span>
                      <span>Subir PDF</span>
                    </button>
                  </div>
                ) : (
                  <ul className="grid gap-2">
                    {value.materials.map((material) => {
                      const isSelected = selectedMaterialId === material.id;
                      return (
                        <li
                          key={material.id}
                          className={`group rounded-2xl border p-3 transition ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-950/30 shadow-md shadow-indigo-950/40"
                              : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                className="block w-full text-left truncate font-semibold text-slate-100 text-xs hover:text-indigo-300 transition"
                                title={material.title}
                                onClick={() => onSelectMaterial && onSelectMaterial(material.id)}
                              >
                                {material.title}
                              </button>
                              <span className="mt-0.5 block text-slate-400 text-[11px] font-mono">
                                {material.pageCount} pág{material.pageCount === 1 ? "" : "s"} · {material.fileName}
                              </span>
                            </div>

                            <button
                              type="button"
                              title="Eliminar material"
                              aria-label={`Eliminar ${material.title}`}
                              className="rounded p-1 text-slate-500 opacity-0 transition group-hover:opacity-100 hover:text-red-400 disabled:opacity-50"
                              disabled={deletingId === material.id}
                              onClick={() => handleDelete(material.id, material.title)}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {deletingId === material.id ? "hourglass_empty" : "delete"}
                              </span>
                            </button>
                          </div>

                          {/* Action links */}
                          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 text-[11px]">
                            <button
                              type="button"
                              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                              onClick={() => onSelectMaterial && onSelectMaterial(material.id)}
                            >
                              <span className="material-symbols-outlined text-xs">visibility</span>
                              <span>Ver PDF</span>
                            </button>

                            {onAskTutor && (
                              <button
                                type="button"
                                className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
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
                <span className="material-symbols-outlined text-xs text-indigo-400">school</span>
                <h2 className="font-semibold text-slate-300 text-xs uppercase tracking-wider font-mono">
                  Recursos de Estudio
                </h2>
              </div>
            </div>

            {AsyncResult.matchWithError(artifacts, {
              onInitial: () => <p className="text-slate-400 text-xs">Cargando recursos…</p>,
              onError: (error) => <p className="text-red-300 text-xs">{String(error)}</p>,
              onDefect: (defect) => <p className="text-red-300 text-xs">{String(defect)}</p>,
              onSuccess: ({ value }) =>
                value.artifacts.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">
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
                          ? "bg-sky-950/80 text-sky-300 border-sky-800/40"
                          : artifact.kind === "quiz"
                          ? "bg-indigo-950/80 text-indigo-300 border-indigo-800/40"
                          : "bg-purple-950/80 text-purple-300 border-purple-800/40";

                      return (
                        <li key={artifact.id}>
                          <button
                            className={`w-full rounded-2xl p-3 text-left transition border ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-950/40 shadow-sm"
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
                              <span className="text-[10px] text-slate-500 font-mono">{artifact.id}</span>
                            </div>
                            <strong className="block text-slate-100 text-xs truncate mt-1">
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

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Proxus Engine v2.0</span>
          <span>Effect v4</span>
        </div>
      </aside>

      <DocumentUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}
