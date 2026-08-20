import type { PdfMaterial } from "@proxus/shared";
import { useRef } from "react";
import { Button, Dialog, InlineError } from "./ui/index.ts";

export interface MaterialDeleteDialogProps {
  readonly material: PdfMaterial | null;
  readonly isDeleting: boolean;
  readonly error: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function MaterialDeleteDialog({
  material,
  isDeleting,
  error,
  onCancel,
  onConfirm
}: MaterialDeleteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const pageLabel = material === null
    ? ""
    : `${material.pageCount} ${material.pageCount === 1 ? "página" : "páginas"}`;

  return (
    <Dialog
      open={material !== null}
      onClose={onCancel}
      title={material === null ? "Eliminar PDF" : `Eliminar «${material.title}»`}
      description="Se eliminarán el PDF y sus páginas procesadas. Esta acción no se puede deshacer."
      dismissible={!isDeleting}
      initialFocusRef={cancelRef}
      size="sm"
      footer={
        <>
          <Button
            ref={cancelRef}
            variant="secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={isDeleting}
            disabled={isDeleting}
          >
            {isDeleting ? "Eliminando…" : "Eliminar PDF"}
          </Button>
        </>
      }
    >
      {material !== null && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {material.fileName}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {pageLabel}
            </p>
          </div>

          {error !== null && (
            <InlineError title="No se pudo eliminar el PDF" message={error} />
          )}
        </div>
      )}
    </Dialog>
  );
}
