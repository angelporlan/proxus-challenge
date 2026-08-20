import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode
} from "react";
import { cx } from "./utils.ts";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant | undefined;
  readonly size?: ButtonSize | undefined;
  readonly loading?: boolean | undefined;
  readonly fullWidth?: boolean | undefined;
  readonly leadingIcon?: ReactNode | undefined;
  readonly trailingIcon?: ReactNode | undefined;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "ui-button--primary",
  secondary: "ui-button--secondary",
  ghost: "ui-button--ghost",
  danger: "ui-button--danger"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "ui-button--sm",
  md: "ui-button--md",
  lg: "ui-button--lg"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref
) {
  const isDisabled = disabled === true || loading;

  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx(
        "ui-button",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "ui-button--full",
        className
      )}
    >
      {loading ? (
        <span className="ui-button__spinner" aria-hidden="true" />
      ) : (
        leadingIcon && <span className="ui-button__icon" aria-hidden="true">{leadingIcon}</span>
      )}
      <span className="ui-button__label">{children}</span>
      {!loading && trailingIcon && (
        <span className="ui-button__icon" aria-hidden="true">{trailingIcon}</span>
      )}
    </button>
  );
});
