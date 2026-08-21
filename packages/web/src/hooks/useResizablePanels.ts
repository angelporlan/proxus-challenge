import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function constrainPanelWidths(sidebar: number, chat: number, viewport: number): { readonly sidebar: number; readonly chat: number } {
  let nextSidebar = clamp(sidebar, 240, 360);
  let nextChat = clamp(chat, 360, 520);
  const available = Math.max(600, viewport - 640 - 12);
  let excess = Math.max(0, nextSidebar + nextChat - available);
  const reduceChat = Math.min(excess, nextChat - 360);
  nextChat -= reduceChat;
  excess -= reduceChat;
  nextSidebar -= Math.min(excess, nextSidebar - 240);
  return { sidebar: Math.round(nextSidebar), chat: Math.round(nextChat) };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export function useViewportWidth(): number {
  const [width, setWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1440));

  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
    };
  }, []);

  return width;
}

export function useResizablePanels() {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return 280;
    const saved = Number(localStorage.getItem("proxus_sidebar_width"));
    return Number.isFinite(saved) && saved >= 240 && saved <= 360 ? saved : 280;
  });

  const [chatWidth, setChatWidth] = useState(() => {
    if (typeof window === "undefined") return 400;
    const saved = Number(localStorage.getItem("proxus_chat_width"));
    return Number.isFinite(saved) && saved >= 360 && saved <= 520 ? saved : 400;
  });

  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const isWideLayout = useMediaQuery("(min-width: 1440px)");
  const viewportWidth = useViewportWidth();

  const layoutWidths = useMemo(
    () => constrainPanelWidths(sidebarWidth, chatWidth, viewportWidth),
    [chatWidth, sidebarWidth, viewportWidth]
  );

  useEffect(() => () => {
    if (typeof document !== "undefined") {
      document.body.classList.remove("is-resizing");
    }
  }, []);

  const beginSidebarResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("is-resizing");
    setIsResizingLeft(true);
  }, []);

  const updateSidebarResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isResizingLeft) return;
    const available = window.innerWidth - layoutWidths.chat - 640 - 12;
    const nextWidth = clamp(event.clientX, 240, Math.min(360, available));
    setSidebarWidth(nextWidth);
    localStorage.setItem("proxus_sidebar_width", String(nextWidth));
  }, [isResizingLeft, layoutWidths.chat]);

  const beginTutorResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("is-resizing");
    setIsResizingRight(true);
  }, []);

  const updateTutorResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isResizingRight) return;
    const available = window.innerWidth - layoutWidths.sidebar - 640 - 12;
    const nextWidth = clamp(window.innerWidth - event.clientX, 360, Math.min(520, available));
    setChatWidth(nextWidth);
    localStorage.setItem("proxus_chat_width", String(nextWidth));
  }, [isResizingRight, layoutWidths.sidebar]);

  const finishResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsResizingLeft(false);
    setIsResizingRight(false);
    document.body.classList.remove("is-resizing");
  }, []);

  const handleSidebarKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const next = clamp(sidebarWidth - 16, 240, 360);
      setSidebarWidth(next);
      localStorage.setItem("proxus_sidebar_width", String(next));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = clamp(sidebarWidth + 16, 240, 360);
      setSidebarWidth(next);
      localStorage.setItem("proxus_sidebar_width", String(next));
    }
  }, [sidebarWidth]);

  const handleTutorKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const next = clamp(chatWidth + 16, 360, 520);
      setChatWidth(next);
      localStorage.setItem("proxus_chat_width", String(next));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = clamp(chatWidth - 16, 360, 520);
      setChatWidth(next);
      localStorage.setItem("proxus_chat_width", String(next));
    }
  }, [chatWidth]);

  return {
    sidebarWidth,
    chatWidth,
    setSidebarWidth,
    setChatWidth,
    viewportWidth,
    layoutWidths,
    isWideLayout,
    isResizingLeft,
    isResizingRight,
    beginSidebarResize,
    updateSidebarResize,
    beginTutorResize,
    updateTutorResize,
    finishResize,
    handleSidebarKeyDown,
    handleTutorKeyDown
  };
}
