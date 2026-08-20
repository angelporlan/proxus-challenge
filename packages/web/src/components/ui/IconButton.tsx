import { forwardRef, type ReactNode } from "react";
import { Button, type ButtonProps } from "./Button.tsx";
import { cx } from "./utils.ts";

export interface IconButtonProps extends Omit<
  ButtonProps,
  "children" | "leadingIcon" | "trailingIcon" | "fullWidth"
> {
  readonly label: string;
  readonly children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({
  label,
  children,
  className,
  title,
  ...props
}, ref) {
  return (
    <Button
      {...props}
      ref={ref}
      aria-label={label}
      title={title ?? label}
      className={cx("ui-icon-button", className)}
    >
      <span aria-hidden="true">{children}</span>
    </Button>
  );
});
