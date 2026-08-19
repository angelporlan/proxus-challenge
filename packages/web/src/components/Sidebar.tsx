import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { PdfMaterial } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { materialsQuery } from "../domain/materials/atoms.ts";

interface SidebarProps {
  readonly selectedArtifactId: string | null;
  readonly onSelectArtifact: (artifactId: string) => void;
  readonly selectedMaterialId?: string | null | undefined;
  readonly onSelectMaterial?: ((materialId: string) => void) | undefined;
  readonly onOpenMindMap?: ((materialId: string) => void) | undefined;
  readonly onAskTutor?: ((prompt: string) => void) | undefined;
  readonly onRequestUpload: () => void;
  readonly onRequestDelete: (material: PdfMaterial, trigger?: HTMLButtonElement) => void;
  readonly deletingMaterialId?: string | null | undefined;
  readonly recentlyUploadedId?: string | null | undefined;
  readonly theme?: "dark" | "light" | undefined;
}

export function Sidebar({
  selectedArtifactId,
  onSelectArtifact,
  selectedMaterialId,
  onSelectMaterial,
  onOpenMindMap,
  onAskTutor,
  onRequestUpload,
  onRequestDelete,
  deletingMaterialId = null,
  recentlyUploadedId = null,
  theme = "dark"
}: SidebarProps) {
  const materials = useAtomValue(materialsQuery);
  const artifacts = useAtomValue(artifactsQuery);
  const refreshMaterials = useAtomRefresh(materialsQuery);
  const refreshArtifacts = useAtomRefresh(artifactsQuery);
  const isLight = theme === "light";

  return (
    <aside
      className={`h-full max-h-none overflow-x-hidden overflow-y-auto border-r p-4 sm:p-5 max-md:border-r-0 max-md:border-b transition-colors ${
        isLight
          ? "border-slate-200 bg-white text-slate-900"
          : "border-slate-800/80 bg-[#090d16] text-slate-100"
      }`}
      aria-label="Biblioteca de estudio"
    >
      <header className="mb-6 flex items-center gap-3">
        <div
          className={`grid size-10 place-items-center rounded-xl border ${
            isLight
              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
              : "border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
          }`}
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            auto_stories
          </span>
        </div>
        <div>
          <strong
            className={`block font-display text-base font-bold tracking-tight ${
              isLight ? "text-slate-900" : "text-slate-100"
            }`}
          >
            Proxus
          </strong>
          <span className={`block text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            Espacio de estudio
          </span>
        </div>
      </header>

      <section className="mb-7 min-w-0" aria-labelledby="materials-heading">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-indigo-500" aria-hidden="true">
              menu_book
            </span>
            <h2
              id="materials-heading"
              tabIndex={-1}
              className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}
            >
              Materiales
            </h2>
          </div>
          <button
            type="button"
            onClick={onRequestUpload}
            className="flex min-h-9 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 min-[1440px]:hidden"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              add
            </span>
            <span>Subir PDF</span>
          </button>
        </div>

        {AsyncResult.matchWithError(materials, {
          onInitial: () => (
            <div className="grid gap-1.5" aria-label="Cargando materiales">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="ui-skeleton ui-skeleton--animated h-12 rounded-lg"
                />
              ))}
            </div>
          ),
          onError: () => <SidebarLoadError message="No se pudieron cargar los materiales." onRetry={refreshMaterials} isLight={isLight} />,
          onDefect: () => <SidebarLoadError message="No se pudieron cargar los materiales." onRetry={refreshMaterials} isLight={isLight} />,
          onSuccess: ({ value }) =>
            value.materials.length === 0 ? (
              <div
                className={`rounded-xl border border-dashed p-4 text-center ${
                  isLight
                    ? "border-slate-300 bg-slate-50 text-slate-500"
                    : "border-slate-800 bg-slate-900/40 text-slate-400"
                }`}
              >
                <p className="text-xs">Sube un PDF para empezar a estudiar.</p>
                <button
                  type="button"
                  onClick={onRequestUpload}
                  className="mt-2 text-xs font-semibold text-indigo-500 hover:underline"
                >
                  Elegir archivo
                </button>
              </div>
            ) : (
              <ul className="grid min-w-0 gap-1.5">
                {value.materials.map((material) => {
                  const isSelected = selectedMaterialId === material.id;
                  const isDeleting = deletingMaterialId === material.id;
                  const isRecent = recentlyUploadedId === material.id;
                  const pageLabel = material.pageCount === 1 ? "1 pág." : `${material.pageCount} págs.`;

                  return (
                    <li
                      key={material.id}
                      className={`group relative flex min-w-0 items-center gap-1 rounded-xl border p-1 transition ${
                        isSelected
                          ? isLight
                            ? "border-indigo-400 bg-indigo-50"
                            : "border-indigo-500/60 bg-indigo-950/40"
                          : isRecent
                          ? isLight
                            ? "ui-enter border-emerald-300 bg-emerald-50/60"
                            : "ui-enter border-emerald-700/60 bg-emerald-950/20"
                          : isLight
                          ? "border-transparent hover:border-slate-200 hover:bg-slate-50"
                          : "border-transparent hover:border-slate-800 hover:bg-slate-900/60"
                      } ${isDeleting ? "opacity-60" : ""}`}
                      aria-busy={isDeleting}
                      data-recently-uploaded={isRecent || undefined}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectMaterial?.(material.id)}
                        disabled={isDeleting || onSelectMaterial === undefined}
                        className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left disabled:cursor-not-allowed"
                        aria-current={isSelected ? "page" : undefined}
                        aria-label={`Abrir ${material.title}, ${pageLabel}`}
                        title={material.title}
                      >
                        <strong
                          className={`block text-xs font-semibold leading-snug break-words line-clamp-2 ${
                            isLight ? "text-slate-800" : "text-slate-100"
                          }`}
                        >
                          {material.title}
                        </strong>
                        <span className={`block text-[11px] leading-tight break-all line-clamp-1 mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                          {pageLabel} · {material.fileName}
                        </span>
                      </button>

                      {/* Floating Quick Action Overlay Buttons (Appears on Hover) */}
                      <div
                        className={`absolute right-1.5 top-1/2 z-20 flex -translate-y-1/2 items-center gap-0.5 rounded-xl border p-0.5 shadow-md backdrop-blur-md transition-all duration-150 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto ${
                          isLight
                            ? "bg-white/95 border-slate-200 shadow-slate-200/80 text-slate-700"
                            : "bg-slate-900/95 border-slate-800 shadow-black/80 text-slate-200"
                        }`}
                      >
                        {onOpenMindMap && (
                          <button
                            type="button"
                            className={`grid size-8 place-items-center rounded-lg transition ${
                              isLight
                                ? "text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                                : "text-slate-400 hover:bg-indigo-950/60 hover:text-indigo-300"
                            }`}
                            onClick={() => onOpenMindMap(material.id)}
                            disabled={isDeleting}
                            aria-label={`Abrir el esquema de ${material.title}`}
                            title="Abrir esquema"
                          >
                            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                              schema
                            </span>
                          </button>
                        )}

                        {onAskTutor && (
                          <button
                            type="button"
                            className={`grid size-8 place-items-center rounded-lg transition ${
                              isLight
                                ? "text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                                : "text-slate-400 hover:bg-indigo-950/60 hover:text-indigo-300"
                            }`}
                            onClick={() =>
                              onAskTutor(`Explica los conceptos principales de los apuntes "${material.title}".`)
                            }
                            disabled={isDeleting}
                            aria-label={`Preguntar al tutor sobre ${material.title}`}
                            title="Preguntar al tutor"
                          >
                            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                              chat
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(event) => {
                            event.currentTarget.focus();
                            onRequestDelete(material, event.currentTarget);
                          }}
                          disabled={isDeleting}
                          className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Eliminar ${material.title}`}
                          title="Eliminar PDF"
                        >
                          <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                            {isDeleting ? "progress_activity" : "delete"}
                          </span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
        })}
      </section>

      <section className="min-w-0" aria-labelledby="resources-heading">
        <div className="mb-2.5 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-indigo-500" aria-hidden="true">
            school
          </span>
          <h2
            id="resources-heading"
            className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}
          >
            Recursos de estudio
          </h2>
        </div>

        {AsyncResult.matchWithError(artifacts, {
          onInitial: () => (
            <div className="grid gap-1.5" aria-label="Cargando recursos">
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="ui-skeleton ui-skeleton--animated h-11 rounded-lg"
                />
              ))}
            </div>
          ),
          onError: () => <SidebarLoadError message="No se pudieron cargar los recursos." onRetry={refreshArtifacts} isLight={isLight} />,
          onDefect: () => <SidebarLoadError message="No se pudieron cargar los recursos." onRetry={refreshArtifacts} isLight={isLight} />,
          onSuccess: ({ value }) =>
            value.artifacts.length === 0 ? (
              <p className={`px-1 text-xs leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Crea una nota, un quiz o un simulacro desde el tutor.
              </p>
            ) : (
              <ul className="grid min-w-0 gap-1">
                {value.artifacts.map((artifact) => {
                  const isSelected = selectedArtifactId === artifact.id;
                  const metadata = getArtifactMetadata(artifact.kind);

                  return (
                    <li key={artifact.id} className="min-w-0">
                      <button
                        className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                          isSelected
                            ? isLight
                              ? "border-indigo-400 bg-indigo-50"
                              : "border-indigo-500/60 bg-indigo-950/40"
                            : isLight
                            ? "border-transparent hover:border-slate-200 hover:bg-slate-50"
                            : "border-transparent hover:border-slate-800 hover:bg-slate-900/60"
                        }`}
                        type="button"
                        onClick={() => onSelectArtifact(artifact.id)}
                        aria-current={isSelected ? "page" : undefined}
                        aria-label={`Abrir ${metadata.label.toLowerCase()}: ${artifact.title}`}
                      >
                        <span
                          className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : isLight
                              ? "bg-slate-100 text-slate-600"
                              : "bg-slate-900 text-slate-400"
                          }`}
                        >
                          <span className="material-symbols-outlined text-base" aria-hidden="true">
                            {metadata.icon}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[10px] font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                            {metadata.label}
                          </span>
                          <strong
                            className={`block text-xs font-semibold leading-snug break-words line-clamp-2 ${
                              isLight ? "text-slate-800" : "text-slate-100"
                            }`}
                            title={artifact.title}
                          >
                            {artifact.title}
                          </strong>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
        })}
      </section>
    </aside>
  );
}

function SidebarLoadError({
  message,
  onRetry,
  isLight
}: {
  readonly message: string;
  readonly onRetry: () => void;
  readonly isLight: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-xs ${
        isLight ? "border-red-200 bg-red-50 text-red-700" : "border-red-500/20 bg-red-500/10 text-red-400"
      }`}
      role="alert"
    >
      <p>{message}</p>
      <button type="button" onClick={onRetry} className="mt-2 min-h-8 rounded-md px-2 font-semibold underline underline-offset-2">
        Reintentar
      </button>
    </div>
  );
}

function getArtifactMetadata(kind: "note" | "quiz" | "test") {
  switch (kind) {
    case "note":
      return { icon: "description", label: "Nota" } as const;
    case "quiz":
      return { icon: "quiz", label: "Quiz" } as const;
    case "test":
      return { icon: "timer", label: "Simulacro" } as const;
  }
}
