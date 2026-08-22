import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { PdfMaterial } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { lazy, Suspense } from "react";
import { materialQuery } from "../../domain/materials/atoms.ts";

const PdfSplitViewer = lazy(() => import("../PdfSplitViewer.tsx").then((m) => ({ default: m.PdfSplitViewer })));

function LazyFallback() {
  return (
    <div className="flex h-full items-center justify-center gap-3 text-slate-400">
      <span className="ui-spinner" />
      <p className="text-sm">Cargando…</p>
    </div>
  );
}

export function SelectedMaterialPdfViewer({
  materialId,
  initialPage,
  onClose,
  onAskAboutPage,
  onAskAboutSelection
}: {
  readonly materialId: string;
  readonly initialPage?: number | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly onAskAboutPage?: ((materialTitle: string, page: number) => void) | undefined;
  readonly onAskAboutSelection?: ((text: string, page: number, material: PdfMaterial) => void) | undefined;
}) {
  const query = materialQuery(materialId);
  const result = useAtomValue(query);
  const refresh = useAtomRefresh(query);
  return AsyncResult.matchWithError(result, {
    onInitial: () => <div className="flex h-full items-center justify-center gap-3 text-slate-400"><span className="ui-spinner" /><p className="text-sm">Cargando PDF…</p></div>,
    onError: () => <LoadError onRetry={refresh} />,
    onDefect: () => <LoadError onRetry={refresh} />,
    onSuccess: ({ value }: { value: PdfMaterial }) => (
      <Suspense fallback={<LazyFallback />}>
        <PdfSplitViewer
          material={value}
          initialPage={initialPage}
          onClose={onClose}
          onAskAboutPage={onAskAboutPage}
          onAskAboutSelection={onAskAboutSelection}
        />
      </Suspense>
    )
  });
}

function LoadError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center"><div className="max-w-sm"><span className="material-symbols-outlined text-3xl text-red-500">error</span><h2 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">No se pudo abrir el PDF</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Comprueba la conexión y vuelve a intentarlo.</p><button type="button" className="ui-secondary-action mt-4" onClick={onRetry}>Reintentar</button></div></div>
  );
}
