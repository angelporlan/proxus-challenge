import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ActiveTab } from "./navigation.ts";

export function WorkspaceTab({ id, label, icon, active, disabled = false, badge, onClick, onKeyDown, isLight }: {
  readonly id: ActiveTab;
  readonly label: string;
  readonly icon: string;
  readonly active: boolean;
  readonly disabled?: boolean;
  readonly badge?: number | undefined;
  readonly onClick: () => void;
  readonly onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  readonly isLight: boolean;
}) {
  return (
    <button
      id={`workspace-tab-${id}`}
      type="button"
      role="tab"
      aria-controls="workspace-panel"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      disabled={disabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
      title={badge && badge > 0 ? `${label} (${badge})` : label}
      className={`flex min-h-8 items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-medium transition-all duration-150 disabled:opacity-40 shrink-0 ${
        active
          ? "bg-indigo-600 text-white shadow-xs font-semibold"
          : isLight
          ? "text-slate-600 hover:bg-white hover:text-slate-900"
          : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
      }`}
    >
      <span className="material-symbols-outlined text-[16px] shrink-0">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
            active
              ? "bg-white/25 text-white"
              : "bg-red-500/15 text-red-500 dark:bg-red-500/20 dark:text-red-400"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
