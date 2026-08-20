import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { IconButton } from "./IconButton.tsx";
import { cx } from "./utils.ts";

export type ToastTone = "neutral" | "success" | "error";

export interface ToastInput {
  readonly title: string;
  readonly description?: string | undefined;
  readonly tone?: ToastTone | undefined;
  /** Set to 0 to keep the notification visible until it is dismissed. */
  readonly duration?: number | undefined;
}

interface ToastItem extends Required<Pick<ToastInput, "title" | "tone">> {
  readonly id: number;
  readonly description?: string | undefined;
}

interface ToastContextValue {
  readonly notify: (input: ToastInput) => number;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 0;

export interface ToastProviderProps {
  readonly children: ReactNode;
  readonly maxToasts?: number | undefined;
}

export function ToastProvider({ children, maxToasts = 4 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ReadonlyArray<ToastItem>>([]);
  const timersRef = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((input: ToastInput) => {
    const id = ++nextToastId;
    const tone = input.tone ?? "neutral";
    const duration = input.duration ?? (tone === "error" ? 6000 : 4000);
    const item: ToastItem = {
      id,
      title: input.title,
      tone,
      ...(input.description === undefined ? {} : { description: input.description })
    };

    setToasts((current) => [...current, item].slice(-Math.max(1, maxToasts)));
    if (duration > 0) {
      const timer = window.setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    }
    return id;
  }, [dismiss, maxToasts]);

  useEffect(() => () => {
    for (const timer of timersRef.current.values()) {
      window.clearTimeout(timer);
    }
    timersRef.current.clear();
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-region" aria-label="Notificaciones">
        {toasts.map((toast) => (
          <article
            key={toast.id}
            className={cx("ui-toast", `ui-toast--${toast.tone}`, "ui-toast-enter")}
            role={toast.tone === "error" ? "alert" : "status"}
            aria-live={toast.tone === "error" ? "assertive" : "polite"}
            aria-atomic="true"
          >
            <span className="ui-toast__icon material-symbols-outlined" aria-hidden="true">
              {toast.tone === "success"
                ? "check_circle"
                : toast.tone === "error"
                  ? "error"
                  : "info"}
            </span>
            <div className="ui-toast__body">
              <strong className="ui-toast__title">{toast.title}</strong>
              {toast.description !== undefined && (
                <p className="ui-toast__description">{toast.description}</p>
              )}
            </div>
            <IconButton
              label={`Cerrar notificación: ${toast.title}`}
              variant="ghost"
              size="sm"
              onClick={() => dismiss(toast.id)}
              className="ui-toast__close"
            >
              <span className="material-symbols-outlined">close</span>
            </IconButton>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
