import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { PdfMaterial } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useState } from "react";
import { createPortal } from "react-dom";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { materialsQuery } from "../domain/materials/atoms.ts";
import { useSavedArtifactIds } from "../domain/artifacts/saved-artifacts.ts";

interface SidebarProps {
  readonly selectedArtifactId: string | null;
  readonly onSelectArtifact: (artifactId: string) => void;
  readonly selectedMaterialId?: string | null | undefined;
  readonly onSelectMaterial?: ((materialId: string) => void) | undefined;
  readonly onOpenMindMap?: ((materialId: string) => void) | undefined;
  readonly onAskTutor?: ((prompt: string) => void) | undefined;
  readonly onRequestUpload: () => void;
  readonly onRequestDelete: (material: PdfMaterial, trigger?: HTMLButtonElement) => void;
  readonly onRequestDeleteArtifact?: ((artifact: { readonly id: string; readonly title: string; readonly kind: "note" | "quiz" | "test" }, trigger?: HTMLButtonElement) => void) | undefined;
  readonly deletingMaterialId?: string | null | undefined;
  readonly recentlyUploadedId?: string | null | undefined;
  readonly onOpenProfile?: (() => void) | undefined;
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
  onRequestDeleteArtifact,
  deletingMaterialId = null,
  recentlyUploadedId = null,
  onOpenProfile,
  theme = "dark"
}: SidebarProps) {
  const materials = useAtomValue(materialsQuery);
  const artifacts = useAtomValue(artifactsQuery);
  const refreshMaterials = useAtomRefresh(materialsQuery);
  const refreshArtifacts = useAtomRefresh(artifactsQuery);
  const savedArtifactIds = useSavedArtifactIds();
  const isLight = theme === "light";
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    id: string;
    title: string;
    subtitle?: string;
    badge?: string;
    top: number;
    left: number;
  } | null>(null);

  const toggleCategory = (kind: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [kind]: !prev[kind]
    }));
  };

  return (
    <aside
      onScroll={() => setHoveredTooltip(null)}
      className={`h-full max-h-none overflow-x-hidden overflow-y-auto border-r p-4 sm:p-5 max-md:border-r-0 max-md:border-b transition-colors ${
        isLight
          ? "border-slate-200 bg-white text-slate-900"
          : "border-slate-800/80 bg-[#090d16] text-slate-100"
      }`}
      aria-label="Biblioteca de estudio"
    >
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`grid size-10 place-items-center rounded-xl border shrink-0 ${
              isLight
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
            }`}
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              auto_stories
            </span>
          </div>
          <div className="min-w-0">
            <strong
              className={`block font-display text-base font-bold tracking-tight truncate ${
                isLight ? "text-slate-900" : "text-slate-100"
              }`}
            >
              Proxus
            </strong>
            <span className={`block text-xs truncate ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Espacio de estudio
            </span>
          </div>
        </div>

        {onOpenProfile && (
          <button
            type="button"
            onClick={onOpenProfile}
            className={`size-8 rounded-xl border grid place-items-center transition active:scale-95 shrink-0 ${
              isLight
                ? "border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 shadow-2xs"
                : "border-purple-800/60 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 shadow-2xs"
            }`}
            title="Personalización: lo que Proxo sabe de ti"
            aria-label="Personalización y memoria del alumno"
          >
            <span className="material-symbols-outlined text-[17px]">psychology</span>
          </button>
        )}
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
            className="flex min-h-8 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500 active:scale-95"
            title="Subir nuevo documento PDF"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
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
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredTooltip({
                          id: material.id,
                          title: material.title,
                          subtitle: `${pageLabel} · ${material.fileName}`,
                          top: rect.top + rect.height / 2,
                          left: rect.right + 12
                        });
                      }}
                      onMouseLeave={() => setHoveredTooltip(null)}
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
                      >
                        <strong
                          className={`truncate block text-xs font-semibold leading-snug ${
                            isLight ? "text-slate-800" : "text-slate-100"
                          }`}
                        >
                          {material.title}
                        </strong>
                        <span className={`truncate block text-[11px] leading-tight mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
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

      {/* Hierarchical Artifacts Section grouped by type */}
      <section className="min-w-0" aria-labelledby="resources-heading">
        <div className="mb-2.5 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-indigo-500" aria-hidden="true">
              folder_special
            </span>
            <h2
              id="resources-heading"
              className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}
            >
              Recursos de estudio
            </h2>
          </div>
          {AsyncResult.match(artifacts, {
            onInitial: () => null,
            onFailure: () => null,
            onSuccess: ({ value }) => (
              <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-full ${
                isLight ? "bg-slate-100 text-slate-600" : "bg-slate-800 text-slate-400"
              }`}>
                {value.artifacts.length}
              </span>
            )
          })}
        </div>

        {AsyncResult.matchWithError(artifacts, {
          onInitial: () => (
            <div className="grid gap-2" aria-label="Cargando recursos">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="ui-skeleton ui-skeleton--animated h-10 rounded-lg"
                />
              ))}
            </div>
          ),
          onError: () => <SidebarLoadError message="No se pudieron cargar los recursos." onRetry={refreshArtifacts} isLight={isLight} />,
          onDefect: () => <SidebarLoadError message="No se pudieron cargar los recursos." onRetry={refreshArtifacts} isLight={isLight} />,
          onSuccess: ({ value }) => {
            if (value.artifacts.length === 0) {
              return (
                <p className={`px-1 text-xs leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  Pide al tutor que genere notas, esquemas, quizzes o simulacros.
                </p>
              );
            }

            const categoriesConfig = [
              {
                kind: "note" as const,
                label: "Notas y Esquemas",
                icon: "description",
                badgeClass: isLight ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
                iconColor: "text-indigo-500"
              },
              {
                kind: "quiz" as const,
                label: "Quizzes de Práctica",
                icon: "quiz",
                badgeClass: isLight ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-purple-500/15 text-purple-300 border-purple-500/30",
                iconColor: "text-purple-500"
              },
              {
                kind: "test" as const,
                label: "Simulacros de Examen",
                icon: "timer",
                badgeClass: isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
                iconColor: "text-emerald-500"
              }
            ];

            return (
              <div className="flex flex-col gap-2.5">
                {categoriesConfig.map((category) => {
                  const items = value.artifacts.filter(
                    (a) => a.kind === category.kind
                  );
                  const isCollapsed = collapsedCategories[category.kind] ?? false;

                  return (
                    <div key={category.kind} className="flex flex-col min-w-0">
                      {/* Folder / Category Header Button */}
                      <button
                        type="button"
                        onClick={() => toggleCategory(category.kind)}
                        className={`flex w-full items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                          isLight
                            ? "text-slate-800 hover:bg-slate-100"
                            : "text-slate-200 hover:bg-slate-800/70"
                        }`}
                        aria-expanded={!isCollapsed}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200"
                            style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                          >
                            expand_more
                          </span>
                          <span className={`material-symbols-outlined text-[17px] ${category.iconColor}`}>
                            {category.icon}
                          </span>
                          <span className="truncate">{category.label}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${category.badgeClass}`}>
                          {items.length}
                        </span>
                      </button>

                      {/* Folder Contents with left tree-guide line */}
                      {!isCollapsed && (
                        <div className="ml-3.5 mt-1 border-l-2 border-slate-200 dark:border-slate-800/80 pl-2 flex flex-col gap-1">
                          {items.length === 0 ? (
                            <p className="px-2 py-1 text-[11px] text-slate-400 dark:text-slate-500 italic">
                              Sin recursos creados
                            </p>
                          ) : (
                            items.map((artifact) => {
                              const isSelected = selectedArtifactId === artifact.id;
                              const isSaved = savedArtifactIds.has(artifact.id);
                              return (
                                <div
                                  key={artifact.id}
                                  onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const kindLabel =
                                      artifact.kind === "quiz"
                                        ? "Quiz de práctica"
                                        : artifact.kind === "note"
                                        ? "Nota de estudio"
                                        : "Simulacro de examen";
                                    setHoveredTooltip({
                                      id: artifact.id,
                                      title: artifact.title,
                                      badge: kindLabel,
                                      top: rect.top + rect.height / 2,
                                      left: rect.right + 12
                                    });
                                  }}
                                  onMouseLeave={() => setHoveredTooltip(null)}
                                  className="group relative flex items-center min-w-0"
                                >
                                  <button
                                    type="button"
                                    onClick={() => onSelectArtifact(artifact.id)}
                                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left transition pr-7 ${
                                      isSelected
                                        ? isLight
                                          ? "bg-indigo-50 border border-indigo-300/80 text-indigo-950 font-semibold shadow-xs"
                                          : "bg-indigo-950/60 border border-indigo-500/50 text-indigo-100 font-semibold shadow-xs"
                                        : isLight
                                        ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                                        : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent"
                                    }`}
                                    aria-current={isSelected ? "page" : undefined}
                                  >
                                    <span
                                      className={`size-1.5 rounded-full shrink-0 ${
                                        isSelected
                                          ? "bg-indigo-600 dark:bg-indigo-400"
                                          : isLight
                                          ? "bg-slate-400 group-hover:bg-indigo-500"
                                          : "bg-slate-600 group-hover:bg-indigo-400"
                                      }`}
                                    />
                                    <span className="truncate block min-w-0 flex-1 text-xs font-medium leading-snug">
                                      {artifact.title}
                                    </span>
                                    {isSaved && (
                                      <span className="material-symbols-outlined text-[13px] text-amber-500 shrink-0" title="Favorito guardado">
                                        star
                                      </span>
                                    )}
                                  </button>

                                  {onRequestDeleteArtifact && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onRequestDeleteArtifact(artifact, e.currentTarget);
                                      }}
                                      className={`absolute right-1 top-1/2 -translate-y-1/2 grid size-6 place-items-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                                        isLight ? "bg-white/90 shadow-xs" : "bg-slate-900/90 shadow-xs"
                                      }`}
                                      title="Eliminar recurso de estudio"
                                      aria-label={`Eliminar ${artifact.title}`}
                                    >
                                      <span className="material-symbols-outlined text-[13px]">delete</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }
        })}
      </section>

      {/* Floating Tooltip positioned fixed to the right of the sidebar / trash can */}
      {hoveredTooltip &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            className={`fixed z-[99999] pointer-events-none rounded-xl border px-3.5 py-2.5 text-xs font-medium shadow-2xl backdrop-blur-md transition-all duration-150 animate-in fade-in zoom-in-95 ${
              isLight
                ? "bg-slate-900 text-white border-slate-700 shadow-slate-900/50"
                : "bg-slate-950 text-slate-100 border-slate-700 shadow-black/90"
            }`}
            style={{
              top: `${hoveredTooltip.top}px`,
              left: `${hoveredTooltip.left}px`,
              transform: "translateY(-50%)",
              maxWidth: "320px"
            }}
          >
            {hoveredTooltip.badge && (
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">
                {hoveredTooltip.badge}
              </span>
            )}
            <p className="font-semibold text-xs leading-snug break-words whitespace-normal text-white">
              {hoveredTooltip.title}
            </p>
            {hoveredTooltip.subtitle && (
              <p className="text-[11px] text-slate-400 mt-1 leading-tight break-all whitespace-normal">
                {hoveredTooltip.subtitle}
              </p>
            )}
          </div>,
          document.body
        )}
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
