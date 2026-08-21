import { useState, useEffect } from "react";

// Explanatory frames (Framed JPG)
import proxoAvatar0 from "../assets/proxo-avatar.jpg";
import proxoAvatar1 from "../assets/proxo-think-1.jpg";
import proxoAvatar2 from "../assets/proxo-think-2.jpg";

// Explanatory frames (Transparent PNG)
import proxoTrans0 from "../assets/proxo-fox-transparent.png";
import proxoTrans1 from "../assets/proxo-think-1-transparent.png";
import proxoTrans2 from "../assets/proxo-think-2-transparent.png";

// Socratic frames (Framed JPG)
import proxoSocraticAvatar0 from "../assets/proxo-socratic-avatar.jpg";
import proxoSocraticAvatar1 from "../assets/proxo-socratic-think-1.jpg";
import proxoSocraticAvatar2 from "../assets/proxo-socratic-think-2.jpg";

// Socratic frames (Transparent PNG)
import proxoSocraticTrans0 from "../assets/proxo-socratic-transparent.png";
import proxoSocraticTrans1 from "../assets/proxo-socratic-think-1-transparent.png";
import proxoSocraticTrans2 from "../assets/proxo-socratic-think-2-transparent.png";

export type ProxoMode = "explanatory" | "socratic";
export type ProxoState = "idle" | "thinking" | "talking";
export type ProxoVariant = "transparent" | "avatar";
export type ProxoSize = "sm" | "md" | "lg" | "xl";

export interface ProxoFrameAnimationProps {
  readonly mode?: ProxoMode | undefined;
  readonly state?: ProxoState | undefined;
  readonly variant?: ProxoVariant | undefined;
  readonly size?: ProxoSize | undefined;
  readonly interactive?: boolean | undefined;
  readonly className?: string | undefined;
  readonly isLight?: boolean | undefined;
}

const EXPLANATORY_FRAMES_AVATAR = [proxoAvatar0, proxoAvatar1, proxoAvatar2, proxoAvatar1];
const EXPLANATORY_FRAMES_TRANS = [proxoTrans0, proxoTrans1, proxoTrans2, proxoTrans1];

const SOCRATIC_FRAMES_AVATAR = [proxoSocraticAvatar0, proxoSocraticAvatar1, proxoSocraticAvatar2, proxoSocraticAvatar1];
const SOCRATIC_FRAMES_TRANS = [proxoSocraticTrans0, proxoSocraticTrans1, proxoSocraticTrans2, proxoSocraticTrans1];

const SIZE_MAP: Record<ProxoSize, { readonly container: string; readonly img: string }> = {
  sm: { container: "size-8", img: "size-8 rounded-xl" },
  md: { container: "size-10", img: "size-10 rounded-xl" },
  lg: { container: "size-20 sm:size-24", img: "size-20 sm:size-24 rounded-2xl" },
  xl: { container: "size-28 sm:size-36", img: "size-28 sm:size-36" }
};

export function ProxoFrameAnimation({
  mode = "explanatory",
  state = "idle",
  variant = "avatar",
  size = "md",
  interactive = false,
  className = ""
}: ProxoFrameAnimationProps) {
  const isSocratic = mode === "socratic";
  const isTransparent = variant === "transparent";
  const [frameIndex, setFrameIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const frames = isSocratic
    ? isTransparent
      ? SOCRATIC_FRAMES_TRANS
      : SOCRATIC_FRAMES_AVATAR
    : isTransparent
    ? EXPLANATORY_FRAMES_TRANS
    : EXPLANATORY_FRAMES_AVATAR;

  // Frame animation loop when thinking or talking
  useEffect(() => {
    if (state === "idle" && !isHovered) {
      setFrameIndex(0);
      return;
    }

    const intervalMs = state === "thinking" ? 400 : 350;
    const interval = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [state, isHovered, frames.length]);

  const currentSrc = frames[frameIndex] ?? frames[0];
  const sizeCfg = SIZE_MAP[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${sizeCfg.container} ${className} ${
        interactive ? "cursor-pointer group" : ""
      }`}
      onMouseEnter={interactive ? () => setIsHovered(true) : undefined}
      onMouseLeave={interactive ? () => setIsHovered(false) : undefined}
      onClick={interactive ? () => setFrameIndex((f) => (f + 1) % frames.length) : undefined}
    >
      <img
        src={currentSrc}
        alt={isSocratic ? "Proxo (Modo Socrático)" : "Proxo (Modo Explicativo)"}
        className={`w-full h-full object-cover transition-opacity duration-150 ${
          isTransparent
            ? "drop-shadow-md"
            : `border shadow-xs ${
                isSocratic
                  ? "border-purple-500/40 ring-1 ring-purple-500/20"
                  : "border-indigo-500/30 ring-1 ring-indigo-500/20"
              } ${sizeCfg.img}`
        }`}
        draggable={false}
      />
    </div>
  );
}
