import { useAtomSet } from "@effect/atom-react";
import type { MaterialPageImages, PageImage, PdfMaterial } from "@proxus/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderMaterialPagesAction } from "../domain/materials/atoms.ts";

interface PdfSplitViewerProps {
  readonly material: PdfMaterial;
  readonly initialPage?: number | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly onAskAboutPage?: ((materialTitle: string, page: number) => void) | undefined;
  readonly onAskAboutSelection?: ((text: string, page: number, materialTitle: string, actionType: "explain" | "quiz") => void) | undefined;
}

// Module-level cache to keep rendered page images and word bounds across tab changes, renders and remounts
const pageCache = new Map<string, PageImage>();
const inFlightRequests = new Map<string, Promise<void>>();

function getCacheKey(materialId: string, page: number): string {
  return `${materialId}::${page}`;
}

export function PdfSplitViewer({
  material,
  initialPage = 1,
  onClose,
  onAskAboutPage,
  onAskAboutSelection
}: PdfSplitViewerProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [fitMode, setFitMode] = useState<"fit-page" | "fit-width" | "custom">("fit-page");
  const [zoom, setZoom] = useState(100);
  const [loadedPages, setLoadedPages] = useState<Record<number, PageImage>>(() => {
    const initial: Record<number, PageImage> = {};
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

  // Floating text selection toolbar state
  const [selectionMenu, setSelectionMenu] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const renderPagesAction = useAtomSet(renderMaterialPagesAction, { mode: "promise" });
  const isMountedRef = useRef(true);
  const mainScrollRef = useRef<HTMLElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

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

  // Reset scroll to top on page change and clear selection
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
    setSelectionMenu(null);
  }, [currentPage]);

  // Load missing cached pages on material change
  useEffect(() => {
    const fromCache: Record<number, PageImage> = {};
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
            const newlyLoaded: Record<number, PageImage> = {};
            for (const item of response.pages) {
              if (item?.data) {
                pageCache.set(getCacheKey(material.id, item.page), item);
                newlyLoaded[item.page] = item;
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
          const updated: Record<number, PageImage> = {};
          for (const p of missing) {
            const item = pageCache.get(getCacheKey(material.id, p));
            if (item) updated[p] = item;
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

  // Selection detection handler
  const checkSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelectionMenu(null);
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 2) {
      setSelectionMenu(null);
      return;
    }

    const container = pageContainerRef.current;
    if (!container) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Check if selection intersects page container
    const contRect = container.getBoundingClientRect();
    if (
      rect.bottom < contRect.top - 50 ||
      rect.top > contRect.bottom + 50 ||
      rect.right < contRect.left - 50 ||
      rect.left > contRect.right + 50
    ) {
      setSelectionMenu(null);
      return;
    }

    setSelectionMenu({
      text,
      top: Math.max(15, rect.top - 12),
      left: Math.max(80, Math.min(window.innerWidth - 80, rect.left + rect.width / 2))
    });
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      // Slight delay so browser finalizes the range selection
      setTimeout(checkSelection, 20);
    };

    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectionMenu(null);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [checkSelection]);

  const handleAskAi = (actionType: "explain" | "quiz" = "explain") => {
    if (!selectionMenu) return;
    const text = selectionMenu.text;
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();

    if (onAskAboutSelection) {
      onAskAboutSelection(text, currentPage, material.title, actionType);
    } else if (onAskAboutPage) {
      onAskAboutPage(material.title, currentPage);
    }
  };

  const handleCopy = async () => {
    if (!selectionMenu) return;
    try {
      await navigator.clipboard.writeText(selectionMenu.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const currentPageData = useMemo(() => {
    return loadedPages[currentPage] ?? pageCache.get(getCacheKey(material.id, currentPage));
  }, [currentPage, loadedPages, material.id]);

  const currentImage = currentPageData?.data;

  const handleWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setFitMode("custom");
      const delta = e.deltaY < 0 ? 10 : -10;
      setZoom((z) => Math.max(40, Math.min(250, z + delta)));
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden relative">
      {/* Top Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid size-8 place-items-center rounded-lg bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 shrink-0">
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate" title={material.title}>
              {material.title}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Página {currentPage} de {material.pageCount} • <span className="text-indigo-600 dark:text-indigo-400 font-medium">Selecciona texto para preguntar a la IA</span>
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Fit Mode Switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200 dark:border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => setFitMode("fit-page")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                fitMode === "fit-page"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Ajustar a pantalla completa (Página completa sin cortes)"
            >
              <span className="material-symbols-outlined text-[15px]">fit_screen</span>
              <span className="hidden md:inline">Ajustar página</span>
            </button>
            <button
              type="button"
              onClick={() => setFitMode("fit-width")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                fitMode === "fit-width"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Ajustar al ancho de lectura"
            >
              <span className="material-symbols-outlined text-[15px]">width</span>
              <span className="hidden md:inline">Ajustar ancho</span>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setFitMode("custom");
                setZoom((z) => Math.max(40, z - 15));
              }}
              className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white"
              title="Reducir zoom"
              aria-label="Reducir zoom"
            >
              <span className="material-symbols-outlined text-sm">remove</span>
            </button>
            <span className="px-1.5 text-xs font-mono text-slate-700 dark:text-slate-300 min-w-[42px] text-center">
              {fitMode === "fit-page" ? "Auto" : fitMode === "fit-width" ? "Ancho" : `${zoom}%`}
            </span>
            <button
              type="button"
              onClick={() => {
                setFitMode("custom");
                setZoom((z) => Math.min(250, z + 15));
              }}
              className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white"
              title="Aumentar zoom"
              aria-label="Aumentar zoom"
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>

          {/* Ask AI about this whole page */}
          <button
            type="button"
            onClick={() => onAskAboutPage && onAskAboutPage(material.title, currentPage)}
            className="flex min-h-8 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-600/20 dark:text-indigo-300 dark:hover:bg-indigo-600/30"
            title="Preguntar al tutor sobre toda esta página"
            aria-label={`Consultar la página ${currentPage} con el tutor`}
          >
            <span className="material-symbols-outlined text-[15px]">psychology</span>
            <span className="hidden sm:inline">Consultar página</span>
          </button>

          {/* Close / Collapse */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Cerrar visor"
              aria-label="Cerrar visor PDF"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      </header>

      {/* Floating Selection Tooltip / Action Bar */}
      {selectionMenu && (
        <div
          style={{
            position: "fixed",
            top: `${selectionMenu.top}px`,
            left: `${selectionMenu.left}px`,
            transform: "translate(-50%, -100%)",
            zIndex: 9999
          }}
          className="flex items-center gap-1 p-1.5 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 text-white shadow-2xl border border-slate-700/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none"
          onMouseDown={(e) => {
            // Prevent selection from clearing when clicking buttons
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <button
            type="button"
            onClick={() => handleAskAi("explain")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition active:scale-95 cursor-pointer"
            title="Pedir al tutor que te explique este fragmento"
          >
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            <span>Preguntar a la IA</span>
          </button>
          <button
            type="button"
            onClick={() => handleAskAi("quiz")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-medium transition active:scale-95 cursor-pointer"
            title="Crear un quiz tipo test sobre este fragmento"
          >
            <span className="material-symbols-outlined text-[16px]">quiz</span>
            <span className="hidden sm:inline">Crear Quiz</span>
          </button>
          <div className="w-px h-4 bg-slate-700/80 mx-0.5" />
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs transition active:scale-95 cursor-pointer"
            title={copied ? "¡Copiado al portapapeles!" : "Copiar fragmento"}
          >
            <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
          </button>
        </div>
      )}

      {/* Main Content: Thumbnails Sidebar + Interactive Page Canvas */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Thumbnails Sidebar */}
        <aside className="w-20 sm:w-28 shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-slate-100/60 dark:bg-slate-900/50 overflow-y-auto p-2 flex flex-col gap-2 pb-24">
          {Array.from({ length: material.pageCount }, (_, i) => i + 1).map((pageNum) => {
            const pageItem = loadedPages[pageNum] ?? pageCache.get(getCacheKey(material.id, pageNum));
            const thumbImage = pageItem?.data;
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

        {/* Center Page Canvas with Interactive Selectable Text Layer */}
        <main
          ref={mainScrollRef}
          onWheel={handleWheel}
          className="flex-1 w-full h-full overflow-auto bg-slate-100/80 dark:bg-slate-950/90 relative"
        >
          {loadingPage && !currentImage && (
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-500 dark:text-slate-400 m-auto">
              <div className="size-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
              <p className="text-sm font-medium">Preparando página {currentPage}…</p>
            </div>
          )}

          {error && !currentImage && (
            <div className="m-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-5 text-center text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 mt-20">
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
            <div className="min-w-full min-h-full flex flex-col items-center justify-start p-4 sm:p-6 pb-36">
              {fitMode === "fit-page" ? (
                <div className="flex flex-1 w-full items-center justify-center min-h-0 my-auto py-1">
                  <div
                    ref={pageContainerRef}
                    className="relative inline-block rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white overflow-hidden"
                  >
                    <img
                      key={`${material.id}-${currentPage}`}
                      src={currentImage}
                      alt={`Página ${currentPage} - ${material.title}`}
                      className="max-h-[calc(100vh-165px)] max-w-full w-auto object-contain block select-none pointer-events-none"
                    />

                    {/* Interactive Text Layer */}
                    {currentPageData?.words && currentPageData.words.length > 0 && currentPageData.dimensions && (
                      <div
                        className="absolute inset-0 select-text overflow-hidden"
                        style={{ width: "100%", height: "100%" }}
                      >
                        {currentPageData.words.map((w, idx) => {
                          const left = (w.xMin / currentPageData.dimensions!.width) * 100;
                          const top = (w.yMin / currentPageData.dimensions!.height) * 100;
                          const width = ((w.xMax - w.xMin) / currentPageData.dimensions!.width) * 100;
                          const height = ((w.yMax - w.yMin) / currentPageData.dimensions!.height) * 100;

                          return (
                            <span
                              key={idx}
                              data-word={w.text}
                              className="absolute select-text cursor-text leading-none text-transparent selection:bg-indigo-500/35 selection:text-transparent"
                              style={{
                                left: `${left}%`,
                                top: `${top}%`,
                                width: `${Math.max(width, 0.4)}%`,
                                height: `${Math.max(height, 1.2)}%`,
                                display: "inline-block",
                                userSelect: "text",
                                WebkitUserSelect: "text"
                              }}
                            >
                              {w.text}{" "}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : fitMode === "fit-width" ? (
                <div
                  ref={pageContainerRef}
                  className="relative w-full max-w-3xl my-2 mx-auto rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white"
                >
                  <img
                    key={`${material.id}-${currentPage}`}
                    src={currentImage}
                    alt={`Página ${currentPage} - ${material.title}`}
                    className="w-full h-auto block select-none pointer-events-none"
                  />

                  {/* Interactive Text Layer */}
                  {currentPageData?.words && currentPageData.words.length > 0 && currentPageData.dimensions && (
                    <div
                      className="absolute inset-0 select-text overflow-hidden"
                      style={{ width: "100%", height: "100%" }}
                    >
                      {currentPageData.words.map((w, idx) => {
                        const left = (w.xMin / currentPageData.dimensions!.width) * 100;
                        const top = (w.yMin / currentPageData.dimensions!.height) * 100;
                        const width = ((w.xMax - w.xMin) / currentPageData.dimensions!.width) * 100;
                        const height = ((w.yMax - w.yMin) / currentPageData.dimensions!.height) * 100;

                        return (
                          <span
                            key={idx}
                            data-word={w.text}
                            className="absolute select-text cursor-text leading-none text-transparent selection:bg-indigo-500/35 selection:text-transparent"
                            style={{
                              left: `${left}%`,
                              top: `${top}%`,
                              width: `${Math.max(width, 0.4)}%`,
                              height: `${Math.max(height, 1.2)}%`,
                              display: "inline-block",
                              userSelect: "text",
                              WebkitUserSelect: "text"
                            }}
                          >
                            {w.text}{" "}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  ref={pageContainerRef}
                  className="relative shadow-2xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white my-2 mx-auto shrink-0"
                  style={{
                    width: `${Math.round(840 * (zoom / 100))}px`,
                    maxWidth: "none"
                  }}
                >
                  <img
                    key={`${material.id}-${currentPage}`}
                    src={currentImage}
                    alt={`Página ${currentPage} - ${material.title}`}
                    className="w-full h-auto block select-none pointer-events-none"
                  />

                  {/* Interactive Text Layer */}
                  {currentPageData?.words && currentPageData.words.length > 0 && currentPageData.dimensions && (
                    <div
                      className="absolute inset-0 select-text overflow-hidden"
                      style={{ width: "100%", height: "100%" }}
                    >
                      {currentPageData.words.map((w, idx) => {
                        const left = (w.xMin / currentPageData.dimensions!.width) * 100;
                        const top = (w.yMin / currentPageData.dimensions!.height) * 100;
                        const width = ((w.xMax - w.xMin) / currentPageData.dimensions!.width) * 100;
                        const height = ((w.yMax - w.yMin) / currentPageData.dimensions!.height) * 100;

                        return (
                          <span
                            key={idx}
                            data-word={w.text}
                            className="absolute select-text cursor-text leading-none text-transparent selection:bg-indigo-500/35 selection:text-transparent"
                            style={{
                              left: `${left}%`,
                              top: `${top}%`,
                              width: `${Math.max(width, 0.4)}%`,
                              height: `${Math.max(height, 1.2)}%`,
                              display: "inline-block",
                              userSelect: "text",
                              WebkitUserSelect: "text"
                            }}
                          >
                            {w.text}{" "}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Floating Navigation Controls */}
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 px-4 py-2 shadow-2xl backdrop-blur-md z-30">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={handlePrev}
              className="grid size-9 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
              title="Página anterior (Flecha Izquierda)"
              aria-label="Página anterior"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <span className="text-xs font-mono px-2 text-slate-700 dark:text-slate-300 font-semibold select-none">
              {currentPage} / {material.pageCount}
            </span>
            <button
              type="button"
              disabled={currentPage >= material.pageCount}
              onClick={handleNext}
              className="grid size-9 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
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
