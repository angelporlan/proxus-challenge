import { type HTMLAttributes } from "react";
import { cx } from "./utils.ts";

export type SkeletonVariant = "text" | "rect" | "circle";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  readonly variant?: SkeletonVariant | undefined;
  readonly animated?: boolean | undefined;
}

export function Skeleton({
  variant = "rect",
  animated = true,
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cx(
        "ui-skeleton",
        `ui-skeleton--${variant}`,
        animated && "ui-skeleton--animated",
        className
      )}
    />
  );
}
