import { useRef } from "react";
import { Button, Dialog, InlineError } from "./ui/index.ts";

export interface ArtifactDeleteDialogProps {
  readonly artifact: { readonly id: string; readonly title: string; readonly kind: "note" | "quiz" | "test" } | null;
  readonly isDeleting: boolean;
  readonly error: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function ArtifactDeleteDialog({
  artifact,
  isDeleting,
  error,
  onCancel,
  onConfirm
}: ArtifactDeleteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const kindLabel =
    artifact?.kind === "quiz"
      ? "Quiz de práctica"
      : artifact?.kind === "note"
      ? "Nota / Esquema de estudio"
      : "Simulacro de examen";

  return (
    <Dialog
      open={artifact !== null}
      onClose={onCancel}
      title={artifact === null ? "Eliminar recurso" : `Eliminar «${artifact.title}»`}
      description="Se eliminará este recurso de estudio de tu biblioteca. Esta acción no se puede deshacer."
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
            {isDeleting ? "Eliminando…" : "Eliminar recurso"}
          </Button>
        </>
      }
    >
      {artifact !== null && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {artifact.title}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {kindLabel}
            </p>
          </div>

          {error !== null && (
            <InlineError title="No se pudo eliminar el recurso" message={error} />
          )}
        </div>
      )}
    </Dialog>
  );
}
