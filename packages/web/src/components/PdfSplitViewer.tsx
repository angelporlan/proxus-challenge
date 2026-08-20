import { useAtomSet } from "@effect/atom-react";
import type { MaterialPageImages, PdfMaterial } from "@proxus/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderMaterialPagesAction } from "../domain/materials/atoms.ts";

interface PdfSplitViewerProps {
  readonly material: PdfMaterial;
  readonly initialPage?: number | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly onAskAboutPage?: ((materialTitle: string, page: number) => void) | undefined;
}

// Module-level cache to keep rendered page images across tab changes, renders and remounts
const pageCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<void>>();

function getCacheKey(materialId: string, page: number): string {
  return `${materialId}::${page}`;
}

export function PdfSplitViewer({
  material,
  initialPage = 1,
  onClose,
  onAskAboutPage
}: PdfSplitViewerProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoom, setZoom] = useState(100);
  const [loadedPages, setLoadedPages] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (let p = 1; p <= material.pageCount; p++) {
      const cached = pageCache.get(getCacheKey(material.id, p));
      if (cached) {
        initial[p] = cached;
      }
    }
    return initial;
  });
  const [loadingPage, setLoadingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderPagesAction = useAtomSet(renderMaterialPagesAction, { mode: "promise" });
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync with initialPage if prop changes externally (e.g. from mind map or chat reference)
  useEffect(() => {
    if (initialPage >= 1 && initialPage <= material.pageCount) {
      setCurrentPage(initialPage);
    }
  }, [initialPage, material.pageCount]);

  // Load missing cached pages on material change
  useEffect(() => {
    const fromCache: Record<number, string> = {};
    for (let p = 1; p <= material.pageCount; p++) {
      const cached = pageCache.get(getCacheKey(material.id, p));
      if (cached) {
        fromCache[p] = cached;
      }
    }
    setLoadedPages(fromCache);
    setError(null);
  }, [material.id, material.pageCount]);

  // Fetch a list of pages with deduplication
  const fetchPagesBatch = useCallback(async (pagesToFetch: number[]): Promise<void> => {
    const missing = pagesToFetch.filter((p) => !pageCache.has(getCacheKey(material.id, p)));
    if (missing.length === 0) return;

    // Filter out pages that are already in-flight
    const needsRequest = missing.filter((p) => !inFlightRequests.has(getCacheKey(material.id, p)));

    if (needsRequest.length > 0) {
      const promise = (async () => {
        try {
          const response: MaterialPageImages = await renderPagesAction({
            id: material.id,
            pages: needsRequest
          });

          if (response.pages) {
            const newlyLoaded: Record<number, string> = {};
            for (const item of response.pages) {
              if (item?.data) {
                pageCache.set(getCacheKey(material.id, item.page), item.data);
                newlyLoaded[item.page] = item.data;
              }
            }

            if (isMountedRef.current) {
              setLoadedPages((prev) => ({
                ...prev,
                ...newlyLoaded
              }));
            }
          }
        } catch (err) {
          if (isMountedRef.current) {
            setError("No se pudo cargar la página.");
          }
        } finally {
          for (const p of needsRequest) {
            inFlightRequests.delete(getCacheKey(material.id, p));
          }
        }
      })();

      for (const p of needsRequest) {
        inFlightRequests.set(getCacheKey(material.id, p), promise);
      }

      await promise;
    } else {
      // Wait for existing in-flight promises
      const existingPromises = missing
        .map((p) => inFlightRequests.get(getCacheKey(material.id, p)))
        .filter((p): p is Promise<void> => Boolean(p));

      if (existingPromises.length > 0) {
        await Promise.all(existingPromises);
        if (isMountedRef.current) {
          const updated: Record<number, string> = {};
          for (const p of missing) {
            const data = pageCache.get(getCacheKey(material.id, p));
            if (data) updated[p] = data;
          }
          setLoadedPages((prev) => ({ ...prev, ...updated }));
        }
      }
    }
  }, [material.id, renderPagesAction]);

  // Main page loader and intelligent preloader
  useEffect(() => {
    let active = true;

    const load = async () => {
      const currentCache = pageCache.get(getCacheKey(material.id, currentPage));
      if (!currentCache) {
        setLoadingPage(true);
        setError(null);
        await fetchPagesBatch([currentPage]);
        if (active && isMountedRef.current) {
          setLoadingPage(false);
        }
      } else {
        setLoadingPage(false);
      }

      // Background preload: preload all pages if small (<= 8 pages) or nearby pages if larger
      if (active) {
        if (material.pageCount <= 8) {
          const allPages = Array.from({ length: material.pageCount }, (_, i) => i + 1);
          void fetchPagesBatch(allPages);
        } else {
          const nearby: number[] = [];
          if (currentPage + 1 <= material.pageCount) nearby.push(currentPage + 1);
          if (currentPage + 2 <= material.pageCount) nearby.push(currentPage + 2);
          if (currentPage - 1 >= 1) nearby.push(currentPage - 1);
          if (nearby.length > 0) {
            void fetchPagesBatch(nearby);
          }
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [currentPage, fetchPagesBatch, material.id, material.pageCount]);

  const handlePrev = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentPage((p) => Math.min(material.pageCount, p + 1));
  }, [material.pageCount]);

  // Keyboard navigation for smooth reading
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea or contenteditable
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  const currentImage = useMemo(() => {
    return loadedPages[currentPage] ?? pageCache.get(getCacheKey(material.id, currentPage));
  }, [currentPage, loadedPages, material.id]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid size-8 place-items-center rounded-lg bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400">
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{material.title}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Página {currentPage} de {material.pageCount}
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom */}
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200 dark:border-slate-700/60 mr-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(50, z - 15))}
              className="grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white"
              title="Reducir zoom"
              aria-label="Reducir zoom"
            >
              <span className="material-symbols-outlined text-sm">remove</span>
            </button>
            <span className="px-2 text-xs font-mono text-slate-700 dark:text-slate-300 min-w-[44px] text-center">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(200, z + 15))}
              className="grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white"
              title="Aumentar zoom"
              aria-label="Aumentar zoom"
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>

          {/* Ask AI about this page */}
          <button
            type="button"
            onClick={() => onAskAboutPage && onAskAboutPage(material.title, currentPage)}
            className="flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-600/20 dark:text-indigo-300 dark:hover:bg-indigo-600/30"
            title="Preguntar al tutor sobre esta página"
            aria-label={`Consultar la página ${currentPage} con el tutor`}
          >
            <span className="material-symbols-outlined text-sm">psychology</span>
            <span className="hidden sm:inline">Consultar página</span>
          </button>

          {/* Close / Collapse */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Cerrar visor"
              aria-label="Cerrar visor PDF"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content: Thumbnails Sidebar + Rendered Page Canvas */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Thumbnails Sidebar */}
        <aside className="w-20 sm:w-28 shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-slate-100/60 dark:bg-slate-900/50 overflow-y-auto p-2 flex flex-col gap-2">
          {Array.from({ length: material.pageCount }, (_, i) => i + 1).map((pageNum) => {
            const thumbImage = loadedPages[pageNum] ?? pageCache.get(getCacheKey(material.id, pageNum));
            const isSelected = currentPage === pageNum;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                aria-label={`Abrir página ${pageNum}`}
                aria-current={isSelected ? "page" : undefined}
                className={`w-full text-center p-1.5 rounded-xl border transition flex flex-col items-center gap-1 group ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm"
                    : "border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="w-full aspect-[3/4] rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-800/60 overflow-hidden relative">
                  {thumbImage ? (
                    <img
                      src={thumbImage}
                      alt={`Página ${pageNum}`}
                      className="w-full h-full object-cover select-none"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">{pageNum}</span>
                      <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-700 animate-pulse" />
                    </div>
                  )}
                </div>
                <span className={`text-[10px] font-medium font-mono ${isSelected ? "font-bold" : ""}`}>
                  Pág. {pageNum}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Center Page Canvas */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center justify-start bg-slate-50 dark:bg-slate-950 relative">
          {loadingPage && !currentImage && (
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-500 dark:text-slate-400">
              <div className="size-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
              <p className="text-sm font-medium">Preparando página {currentPage}…</p>
            </div>
          )}

          {error && !currentImage && (
            <div className="m-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-5 text-center text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              <span className="material-symbols-outlined text-3xl text-red-500 mb-2">error</span>
              <p className="font-semibold text-sm mb-1">No se pudo cargar la página</p>
              <p className="text-xs text-red-600 dark:text-red-300/80">{error}</p>
              <button
                type="button"
                className="ui-secondary-action mt-4"
                onClick={() => {
                  setError(null);
                  void fetchPagesBatch([currentPage]);
                }}
              >
                Reintentar
              </button>
            </div>
          )}

          {currentImage && (
            <div
              className="transition-[width] duration-150 shadow-lg rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white"
              style={{
                width: `${zoom}%`,
                maxWidth: `${Math.max(100, zoom)}%`
              }}
            >
              <img
                key={`${material.id}-${currentPage}`}
                src={currentImage}
                alt={`Página ${currentPage} - ${material.title}`}
                className="w-full h-auto block select-none"
              />
            </div>
          )}

          {/* Floating Navigation Controls */}
          <div className="sticky bottom-4 mt-auto flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-3 py-2 shadow-lg backdrop-blur z-20">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={handlePrev}
              className="grid size-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800 transition active:scale-95"
              title="Página anterior (Flecha Izquierda)"
              aria-label="Página anterior"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <span className="text-xs font-mono px-2 text-slate-700 dark:text-slate-300 select-none">
              {currentPage} / {material.pageCount}
            </span>
            <button
              type="button"
              disabled={currentPage >= material.pageCount}
              onClick={handleNext}
              className="grid size-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800 transition active:scale-95"
              title="Página siguiente (Flecha Derecha)"
              aria-label="Página siguiente"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
