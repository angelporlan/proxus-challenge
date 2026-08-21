import { type RefObject } from "react";
import type { AgentMessage, ChatSession } from "@proxus/shared";

export interface ChatHistoryMenuProps {
  readonly sessions: readonly ChatSession[];
  readonly currentSessionId: string;
  readonly isOpen: boolean;
  readonly isLight: boolean;
  readonly menuRef: RefObject<HTMLDivElement | null>;
  readonly onToggleOpen: () => void;
  readonly onNewChat: () => void;
  readonly onSelectSession: (session: ChatSession) => void;
  readonly onDeleteSession: (sessionId: string, event: React.MouseEvent) => void;
}

export function ChatHistoryMenu({
  sessions,
  currentSessionId,
  isOpen,
  isLight,
  menuRef,
  onToggleOpen,
  onNewChat,
  onSelectSession,
  onDeleteSession
}: ChatHistoryMenuProps) {
  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={onToggleOpen}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-95 ${
          isOpen
            ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
            : isLight
            ? "border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs"
            : "border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-200 shadow-2xs"
        }`}
        title="Historial de conversaciones con Proxo"
        aria-label="Historial de conversaciones"
      >
        <span className="material-symbols-outlined text-[16px]">history</span>
        <span>Historial</span>
        {sessions.length > 0 && (
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              isOpen
                ? "bg-white/25 text-white"
                : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
            }`}
          >
            {sessions.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isLight ? "bg-white border-slate-200 text-slate-900 shadow-slate-300/50" : "bg-[#0d121d] border-slate-800 text-slate-100 shadow-black/80"
          }`}
        >
          <div
            className={`p-3 border-b flex items-center justify-between ${
              isLight ? "bg-slate-50/80 border-slate-200" : "bg-slate-900/80 border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-500 text-base">chat</span>
              <strong className="text-xs font-bold">Historial de chats</strong>
            </div>
            <button
              type="button"
              onClick={onNewChat}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition active:scale-95"
              title="Crear un nuevo chat"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Nuevo</span>
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-2xl mb-1 text-slate-400">history_toggle_off</span>
                <p className="font-semibold">No hay chats guardados</p>
                <p className="text-[11px] mt-0.5">Tus conversaciones con Proxo se guardarán automáticamente aquí.</p>
              </div>
            ) : (
              sessions.map((sess) => {
                const isActive = sess.id === currentSessionId;
                const userMsgCount = sess.messages.filter((m: AgentMessage) => m.role === "user").length;
                return (
                  <div
                    key={sess.id}
                    onClick={() => onSelectSession(sess)}
                    className={`group flex items-center justify-between gap-2 p-2 rounded-xl cursor-pointer transition text-xs ${
                      isActive
                        ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 font-semibold"
                        : isLight
                        ? "hover:bg-slate-100 text-slate-700"
                        : "hover:bg-slate-900 text-slate-300"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] shrink-0 text-slate-400">
                          {sess.mode === "socratic" ? "school" : "chat_bubble"}
                        </span>
                        <p className="truncate text-xs font-medium">{sess.title}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{userMsgCount} {userMsgCount === 1 ? "mensaje" : "mensajes"}</span>
                        <span>·</span>
                        <span>{new Date(sess.updatedAt).toLocaleDateString()}</span>
                        {sess.mode === "socratic" && (
                          <span className="text-[9px] px-1 rounded bg-purple-500/15 text-purple-500 font-medium">Socrático</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => onDeleteSession(sess.id, e)}
                      className="opacity-0 group-hover:opacity-100 size-6 grid place-items-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0"
                      title="Eliminar este chat del historial"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
