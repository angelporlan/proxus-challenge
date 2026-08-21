import type { ChatSession } from "@proxus/shared";
import type { MouseEvent, RefObject } from "react";
import { ChatHistoryMenu } from "../ChatHistoryMenu.tsx";

export function ChatHeader({
  isLight,
  isMaximized,
  isHistoryOpen,
  sessions,
  currentSessionId,
  historyMenuRef,
  onNewChat,
  onToggleHistory,
  onSelectSession,
  onDeleteSession,
  onToggleMaximize
}: {
  readonly isLight: boolean;
  readonly isMaximized: boolean;
  readonly isHistoryOpen: boolean;
  readonly sessions: readonly ChatSession[];
  readonly currentSessionId: string;
  readonly historyMenuRef: RefObject<HTMLDivElement | null>;
  readonly onNewChat: () => void;
  readonly onToggleHistory: () => void;
  readonly onSelectSession: (session: ChatSession) => void;
  readonly onDeleteSession: (sessionId: string, event: MouseEvent) => void;
  readonly onToggleMaximize?: (() => void) | undefined;
}) {
  return (
    <header
      className={`flex items-center justify-between gap-2 border-b px-4 py-3 pr-14 backdrop-blur z-10 transition-colors min-[1440px]:pr-4 ${
        isLight ? "border-slate-200 bg-white/90" : "border-slate-800 bg-slate-950/80"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNewChat}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-95 ${
            isLight
              ? "border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs"
              : "border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-200 shadow-2xs"
          }`}
          title="Iniciar un nuevo chat limpio con Proxo"
          aria-label="Nuevo chat"
        >
          <span className="material-symbols-outlined text-[16px] text-indigo-500">add</span>
          <span>Nuevo chat</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <ChatHistoryMenu
          sessions={sessions}
          currentSessionId={currentSessionId}
          isOpen={isHistoryOpen}
          isLight={isLight}
          menuRef={historyMenuRef}
          onToggleOpen={onToggleHistory}
          onNewChat={onNewChat}
          onSelectSession={onSelectSession}
          onDeleteSession={onDeleteSession}
        />

        {onToggleMaximize && (
          <button
            type="button"
            onClick={onToggleMaximize}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              isMaximized
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                : isLight
                ? "border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-sm"
                : "border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800"
            }`}
            title={
              isMaximized
                ? "Salir de Modo Chat Completo (Restaurar espacio de estudio)"
                : "Modo Chat Completo (Pantalla Completa)"
            }
            aria-label={isMaximized ? "Salir de Modo Chat Completo" : "Modo Chat Completo"}
          >
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
              {isMaximized ? "close_fullscreen" : "open_in_full"}
            </span>
            <span className="hidden sm:inline">{isMaximized ? "Restaurar" : "Modo Chat"}</span>
          </button>
        )}
      </div>
    </header>
  );
}
