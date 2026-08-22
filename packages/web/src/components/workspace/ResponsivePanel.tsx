import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { IconButton } from "../ui/IconButton.tsx";

export function ResponsivePanel({ side, label, open, onClose, width, laptopWidth, isWide, returnFocusRef, fallbackFocusRef, children }: {
  readonly side: "left" | "right";
  readonly label: string;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly width: number;
  readonly laptopWidth: number;
  readonly isWide: boolean;
  readonly returnFocusRef: RefObject<HTMLElement | null>;
  readonly fallbackFocusRef: RefObject<HTMLElement | null>;
  readonly children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isDesktopChat = isWide && side === "right";
  const [isDesktopChatMounted, setIsDesktopChatMounted] = useState(open);
  const [isDesktopChatVisible, setIsDesktopChatVisible] = useState(open);

  useEffect(() => {
    if (!isDesktopChat) return;

    if (open) {
      setIsDesktopChatMounted(true);
      const frame = window.requestAnimationFrame(() => setIsDesktopChatVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setIsDesktopChatVisible(false);
    const timeout = window.setTimeout(() => setIsDesktopChatMounted(false), 260);
    return () => window.clearTimeout(timeout);
  }, [isDesktopChat, open]);

  useEffect(() => {
    if (isWide || !open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const previousFocus = returnFocusRef.current
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute("hidden"));
    requestAnimationFrame(() => focusables()[0]?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!panel.contains(document.activeElement)) {
        if (document.querySelector("dialog[open]")) {
          return;
        }
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => {
        const canRestorePrevious = previousFocus?.isConnected
          && previousFocus.closest("[inert], [aria-hidden='true']") === null;
        (canRestorePrevious ? previousFocus : fallbackFocusRef.current)?.focus();
      });
    };
  }, [fallbackFocusRef, isWide, onClose, open, returnFocusRef]);

  if (isDesktopChat && !isDesktopChatMounted) {
    return null;
  }

  const panelIsOpen = isDesktopChat ? isDesktopChatVisible : open;

  return (
    <>
      <button type="button" tabIndex={-1} aria-hidden="true" onClick={onClose} className={`fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] transition-opacity min-[1440px]:hidden ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} />
      <div
        ref={panelRef}
        role={isWide ? undefined : "dialog"}
        aria-modal={isWide ? undefined : true}
        aria-label={label}
        aria-hidden={!isWide && !open ? true : undefined}
        inert={!isWide && !open ? true : undefined}
        style={{ width: `${isWide ? width : laptopWidth}px` }}
        className={`fixed inset-y-0 z-50 h-full max-w-[calc(100vw-3rem)] shrink-0 overflow-hidden bg-[var(--panel-bg)] transition-transform duration-[240ms] ease-out will-change-transform min-[1440px]:static min-[1440px]:z-auto min-[1440px]:max-w-none ${side === "left" ? "left-0 min-[1440px]:translate-x-0" : "right-0"} ${panelIsOpen ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full"}`}
      >
        <IconButton label={`Cerrar ${label.toLowerCase()}`} variant="ghost" onClick={onClose} className="absolute right-3 top-3 z-[60] min-[1440px]:hidden"><span className="material-symbols-outlined text-[18px]">close</span></IconButton>
        {children}
      </div>
    </>
  );
}
