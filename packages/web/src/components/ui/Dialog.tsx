import {
  useEffect,
  useId,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject
} from "react";
import { IconButton } from "./IconButton.tsx";
import { cx } from "./utils.ts";

export type DialogSize = "sm" | "md" | "lg";

export interface DialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string | undefined;
  readonly dismissible?: boolean | undefined;
  readonly initialFocusRef?: RefObject<HTMLElement | null> | undefined;
  readonly children: ReactNode;
  readonly footer?: ReactNode | undefined;
  readonly size?: DialogSize | undefined;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: "ui-dialog__surface--sm",
  md: "ui-dialog__surface--md",
  lg: "ui-dialog__surface--lg"
};

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export function Dialog({
  open,
  onClose,
  title,
  description,
  dismissible = true,
  initialFocusRef,
  children,
  footer,
  size = "md"
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }

    if (open) {
      if (!wasOpenRef.current) {
        restoreFocusRef.current = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      }
      if (!dialog.open) {
        dialog.showModal();
      }
      queueMicrotask(() => {
        const focusTarget = initialFocusRef?.current
          ?? dialog.querySelector<HTMLElement>(focusableSelector);
        focusTarget?.focus();
      });
    } else if (dialog.open) {
      dialog.close();
    }

    if (!open && wasOpenRef.current) {
      queueMicrotask(() => {
        const target = restoreFocusRef.current;
        if (!target?.isConnected) return;
        target.focus();
        requestAnimationFrame(() => {
          if (target.isConnected) target.focus();
        });
      });
    }
    wasOpenRef.current = open;
  }, [initialFocusRef, open]);

  useEffect(() => () => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
    restoreFocusRef.current?.focus();
  }, []);

  const requestClose = () => {
    if (dismissible) {
      onClose();
    }
  };

  const handleBackdropPointerDown = (event: ReactPointerEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="ui-dialog"
      aria-labelledby={titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          requestClose();
        }
      }}
      onPointerDown={handleBackdropPointerDown}
    >
      <div className={cx("ui-dialog__surface", sizeClasses[size])}>
        <header className="ui-dialog__header">
          <div className="ui-dialog__heading">
            <h2 id={titleId} className="ui-dialog__title">{title}</h2>
            {description !== undefined && (
              <p id={descriptionId} className="ui-dialog__description">{description}</p>
            )}
          </div>
          {dismissible && (
            <IconButton
              label="Cerrar diálogo"
              variant="ghost"
              size="sm"
              onClick={requestClose}
              className="ui-dialog__close"
            >
              <span className="material-symbols-outlined">close</span>
            </IconButton>
          )}
        </header>
        <div className="ui-dialog__content">{children}</div>
        {footer !== undefined && <footer className="ui-dialog__footer">{footer}</footer>}
      </div>
    </dialog>
  );
}
