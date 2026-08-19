import { useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useState } from "react";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { deleteMaterialAction, materialsQuery } from "../domain/materials/atoms.ts";
import { DocumentUploadModal } from "./DocumentUploadModal.tsx";

interface SidebarProps {
  readonly selectedArtifactId: string | null;
  readonly onSelectArtifact: (artifactId: string) => void;
  readonly onAskTutor?: (prompt: string) => void;
}

export function Sidebar({ selectedArtifactId, onSelectArtifact, onAskTutor }: SidebarProps) {
  const materials = useAtomValue(materialsQuery);
  const artifacts = useAtomValue(artifactsQuery);
  const deleteMaterial = useAtomSet(deleteMaterialAction, { mode: "promise" });
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteMaterial(id);
    } catch (cause) {
      alert(`Failed to delete material: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <aside className="h-screen overflow-y-auto border-slate-800 border-r bg-slate-950 p-5 max-md:h-auto max-md:max-h-[45vh] max-md:border-r-0 max-md:border-b">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 font-extrabold text-white">
            P
          </div>
          <div>
            <strong className="block text-slate-100">Proxus Tutor</strong>
            <span className="block text-slate-400 text-sm">Academic assistant</span>
          </div>
        </div>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-widest">Materials</h2>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 font-medium text-sky-400 text-xs transition hover:bg-sky-500/20 hover:text-sky-300"
              onClick={() => setIsUploadOpen(true)}
            >
              <span>+</span> Upload PDF
            </button>
          </div>
          {AsyncResult.matchWithError(materials, {
            onInitial: () => <p className="text-slate-400">Loading materials…</p>,
            onError: (error) => <p className="text-red-200">{String(error)}</p>,
            onDefect: (defect) => <p className="text-red-200">{String(defect)}</p>,
            onSuccess: ({ value }) => value.materials.length === 0
              ? (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-center">
                    <p className="text-slate-400 text-sm">No uploaded PDFs yet.</p>
                    <button
                      type="button"
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-sky-400 px-3.5 py-1.5 font-semibold text-slate-950 text-xs transition hover:bg-sky-300"
                      onClick={() => setIsUploadOpen(true)}
                    >
                      Upload study material
                    </button>
                  </div>
                )
              : (
                  <details className="rounded-2xl border border-slate-800 bg-slate-900" open>
                    <summary className="cursor-pointer px-4 py-3 font-medium text-slate-100 marker:text-sky-400">
                      {value.materials.length} material{value.materials.length === 1 ? "" : "s"}
                    </summary>
                    <ul className="grid gap-2 border-slate-800 border-t p-3">
                      {value.materials.map((material) => (
                        <li
                          className="group rounded-xl border border-transparent bg-slate-950/70 p-3 transition hover:border-slate-800 hover:bg-slate-950"
                          key={material.id}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <strong className="block truncate text-slate-100 text-sm" title={material.title}>
                                {material.title}
                              </strong>
                              <span className="mt-1 block text-slate-400 text-xs">
                                {material.pageCount} page{material.pageCount === 1 ? "" : "s"} · {material.fileName}
                              </span>
                            </div>
                            <button
                              type="button"
                              title="Delete material"
                              aria-label={`Delete ${material.title}`}
                              className="rounded p-1 text-slate-500 opacity-0 transition group-hover:opacity-100 hover:text-red-400 disabled:opacity-50"
                              disabled={deletingId === material.id}
                              onClick={() => handleDelete(material.id, material.title)}
                            >
                              {deletingId === material.id ? "…" : "✕"}
                            </button>
                          </div>
                          {onAskTutor && (
                            <button
                              type="button"
                              className="mt-2.5 flex items-center gap-1 text-left text-sky-400 text-xs hover:text-sky-300 hover:underline"
                              onClick={() => onAskTutor(`Explica los conceptos principales de los apuntes "${material.title}" (${material.id})`)}
                            >
                              <span>💬 Ask tutor about this</span>
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )
          })}
        </section>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-widest">Artifacts</h2>
          </div>
          {AsyncResult.matchWithError(artifacts, {
            onInitial: () => <p className="text-slate-400">Loading artifacts…</p>,
            onError: (error) => <p className="text-red-200">{String(error)}</p>,
            onDefect: (defect) => <p className="text-red-200">{String(defect)}</p>,
            onSuccess: ({ value }) => value.artifacts.length === 0
              ? <p className="text-slate-400">No notes, quizzes, or tests yet.</p>
              : (
                  <details className="rounded-2xl border border-slate-800 bg-slate-900">
                    <summary className="cursor-pointer px-4 py-3 font-medium text-slate-100 marker:text-sky-400">
                      {value.artifacts.length} artifact{value.artifacts.length === 1 ? "" : "s"}
                    </summary>
                    <ul className="grid gap-2 border-slate-800 border-t p-3">
                      {value.artifacts.map((artifact) => (
                        <li key={artifact.id}>
                          <button
                            className={`w-full rounded-xl p-3 text-left transition hover:border-sky-500 hover:bg-slate-950 ${
                              selectedArtifactId === artifact.id
                                ? "border border-sky-500 bg-sky-950/40"
                                : "border border-transparent bg-slate-950/70"
                            }`}
                            type="button"
                            onClick={() => onSelectArtifact(artifact.id)}
                          >
                            <strong className="block text-slate-100">{artifact.title}</strong>
                            <span className="mt-1 block text-slate-400 text-sm">{artifact.kind} · {artifact.id}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                )
          })}
        </section>
      </aside>
      <DocumentUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}

