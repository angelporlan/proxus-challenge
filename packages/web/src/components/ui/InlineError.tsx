import { type ReactNode } from "react";
import { Button } from "./Button.tsx";
import { cx } from "./utils.ts";

export interface InlineErrorProps {
  readonly title?: string | undefined;
  readonly message: ReactNode;
  readonly onRetry?: (() => void) | undefined;
  readonly retryLabel?: string | undefined;
  readonly className?: string | undefined;
}

export function InlineError({
  title = "No se pudo completar la acción",
  message,
  onRetry,
  retryLabel = "Reintentar",
  className
}: InlineErrorProps) {
  return (
    <div className={cx("ui-inline-error", "ui-enter", className)} role="alert">
      <span className="ui-inline-error__icon material-symbols-outlined" aria-hidden="true">
        error
      </span>
      <div className="ui-inline-error__body">
        <strong className="ui-inline-error__title">{title}</strong>
        <div className="ui-inline-error__message">{message}</div>
      </div>
      {onRetry !== undefined && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
