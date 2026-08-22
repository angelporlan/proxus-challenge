import type { ChatSession } from "@proxus/shared";
import type { MouseEvent, RefObject } from "react";
import { ChatHistoryMenu } from "../ChatHistoryMenu.tsx";

export function ChatHeader({
  isLight,
  isHistoryOpen,
  sessions,
  currentSessionId,
  historyMenuRef,
  onNewChat,
  onToggleHistory,
  onSelectSession,
  onDeleteSession
}: {
  readonly isLight: boolean;
  readonly isHistoryOpen: boolean;
  readonly sessions: readonly ChatSession[];
  readonly currentSessionId: string;
  readonly historyMenuRef: RefObject<HTMLDivElement | null>;
  readonly onNewChat: () => void;
  readonly onToggleHistory: () => void;
  readonly onSelectSession: (session: ChatSession) => void;
  readonly onDeleteSession: (sessionId: string, event: MouseEvent) => void;
}) {
  return (
    <header
      className={`flex items-center justify-center gap-2 border-b px-4 py-3 backdrop-blur z-10 transition-colors ${
        isLight ? "border-slate-200 bg-white/90" : "border-slate-800 bg-slate-950/80"
      }`}
    >
      <div className="flex w-full max-w-6xl items-center justify-between gap-2 pr-10 min-[1440px]:pr-0">
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

        </div>
      </div>
    </header>
  );
}
