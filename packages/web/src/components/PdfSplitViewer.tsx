import { useAtomSet } from "@effect/atom-react";
import type { MaterialPageImages, PdfMaterial } from "@proxus/shared";
import { useEffect, useState } from "react";
import { renderMaterialPagesAction } from "../domain/materials/atoms.ts";

interface PdfSplitViewerProps {
  readonly material: PdfMaterial;
  readonly initialPage?: number | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly onAskAboutPage?: ((materialTitle: string, page: number) => void) | undefined;
}

export function PdfSplitViewer({
  material,
  initialPage = 1,
  onClose,
  onAskAboutPage
}: PdfSplitViewerProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoom, setZoom] = useState(100);
  const [pageImages, setPageImages] = useState<Record<number, string>>({});
  const [loadingPage, setLoadingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const renderPages = useAtomSet(renderMaterialPagesAction, { mode: "promise" });

  useEffect(() => {
    setCurrentPage(initialPage);
    setPageImages({});
    setError(null);
    setZoom(100);
  }, [initialPage, material.id]);

  useEffect(() => {
    let isCancelled = false;

    const fetchPage = async (page: number) => {
      if (pageImages[page]) {
        return;
      }

      setLoadingPage(true);
      setError(null);

      try {
        const response: MaterialPageImages = await renderPages({
          id: material.id,
          pages: [page]
        });

        if (!isCancelled && response.pages && response.pages.length > 0) {
          const first = response.pages[0];
          if (first) {
            setPageImages((prev) => ({
              ...prev,
              [page]: first.data
            }));
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setError("No se pudo preparar esta página.");
        }
      } finally {
        if (!isCancelled) {
          setLoadingPage(false);
        }
      }
    };

    void fetchPage(currentPage);

    // Preload next page in background
    if (currentPage < material.pageCount && !pageImages[currentPage + 1]) {
      void renderPages({
        id: material.id,
        pages: [currentPage + 1]
      }).then((res) => {
        if (!isCancelled && res.pages && res.pages[0]) {
          setPageImages((prev) => ({
            ...prev,
            [currentPage + 1]: res.pages[0]!.data
          }));
        }
      }).catch(() => {});
    }

    return () => {
      isCancelled = true;
    };
  }, [currentPage, material.id, retryKey]);

  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < material.pageCount) {
      setCurrentPage((p) => p + 1);
    }
  };

  const currentImage = pageImages[currentPage];

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
            <span className="px-2 text-xs font-mono text-slate-700 dark:text-slate-300">{zoom}%</span>
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
          {Array.from({ length: material.pageCount }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => setCurrentPage(pageNum)}
              aria-label={`Abrir página ${pageNum}`}
              aria-current={currentPage === pageNum ? "page" : undefined}
              className={`w-full text-center p-1.5 rounded-xl border transition flex flex-col items-center gap-1 ${
                currentPage === pageNum
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm"
                  : "border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <div className="w-full aspect-[3/4] rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-800/60 overflow-hidden">
                {pageImages[pageNum] ? (
                  <img
                    src={pageImages[pageNum]}
                    alt={`Página ${pageNum}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">{pageNum}</span>
                )}
              </div>
              <span className="text-[10px] font-medium font-mono">Pág. {pageNum}</span>
            </button>
          ))}
        </aside>

        {/* Center Page Canvas */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center justify-start bg-slate-50 dark:bg-slate-950 relative">
          {loadingPage && !currentImage && (
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-500 dark:text-slate-400">
              <div className="size-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
              <p className="text-sm font-medium">Preparando página {currentPage}…</p>
            </div>
          )}

          {error && (
            <div className="m-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-5 text-center text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              <span className="material-symbols-outlined text-3xl text-red-500 mb-2">error</span>
              <p className="font-semibold text-sm mb-1">No se pudo cargar la página</p>
              <p className="text-xs text-red-600 dark:text-red-300/80">{error}</p>
              <button
                type="button"
                className="ui-secondary-action mt-4"
                onClick={() => setRetryKey((current) => current + 1)}
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
                src={currentImage}
                alt={`Página ${currentPage} - ${material.title}`}
                className="w-full h-auto block select-none"
              />
            </div>
          )}

          {/* Floating Navigation Controls */}
          <div className="sticky bottom-4 mt-auto flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-3 py-2 shadow-lg backdrop-blur">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={handlePrev}
              className="grid size-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Página anterior"
              aria-label="Página anterior"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <span className="text-xs font-mono px-2 text-slate-700 dark:text-slate-300">
              {currentPage} / {material.pageCount}
            </span>
            <button
              type="button"
              disabled={currentPage >= material.pageCount}
              onClick={handleNext}
              className="grid size-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Página siguiente"
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
