import {
  createContext,
  useContext,
  useId,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode
} from "react";
import { cx } from "./utils.ts";

type TabsOrientation = "horizontal" | "vertical";

interface TabsContextValue {
  readonly baseId: string;
  readonly value: string;
  readonly orientation: TabsOrientation;
  readonly onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (context === null) {
    throw new Error("Tabs components must be used inside Tabs");
  }
  return context;
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly orientation?: TabsOrientation | undefined;
  readonly children: ReactNode;
}

export function Tabs({
  value,
  onValueChange,
  orientation = "horizontal",
  children,
  className,
  ...props
}: TabsProps) {
  const baseId = useId();

  return (
    <TabsContext.Provider value={{ baseId, value, orientation, onValueChange }}>
      <div {...props} className={cx("ui-tabs", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export function TabsList({ children, className, onKeyDown, ...props }: TabsListProps) {
  const { orientation } = useTabsContext();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }

    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='tab']:not(:disabled)")
    );
    const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex < 0 || tabs.length === 0) {
      return;
    }

    const previousKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    let nextIndex: number | undefined;
    if (event.key === previousKey) {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === nextKey) {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      tabs[nextIndex]?.focus();
      tabs[nextIndex]?.click();
    }
  };

  return (
    <div
      {...props}
      role="tablist"
      aria-orientation={orientation}
      className={cx("ui-tabs__list", className)}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

export interface TabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  readonly value: string;
  readonly children: ReactNode;
}

export function Tab({ value, children, className, onClick, disabled, ...props }: TabProps) {
  const context = useTabsContext();
  const selected = context.value === value;
  const idPart = safeId(value);

  return (
    <button
      {...props}
      type="button"
      role="tab"
      id={`${context.baseId}-tab-${idPart}`}
      aria-controls={`${context.baseId}-panel-${idPart}`}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      className={cx("ui-tabs__tab", selected && "ui-tabs__tab--active", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          context.onValueChange(value);
        }
      }}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  readonly value: string;
  readonly children: ReactNode;
}

export function TabPanel({ value, children, className, ...props }: TabPanelProps) {
  const context = useTabsContext();
  const selected = context.value === value;
  const idPart = safeId(value);

  return (
    <div
      {...props}
      role="tabpanel"
      id={`${context.baseId}-panel-${idPart}`}
      aria-labelledby={`${context.baseId}-tab-${idPart}`}
      tabIndex={0}
      hidden={!selected}
      className={cx("ui-tabs__panel", className)}
    >
      {children}
    </div>
  );
}
