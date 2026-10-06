import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Every theme uses a real two-stop gradient (see app/globals.css) - `.gradient-surface` adds a
  // crisp 1px edge so the shape reads clearly even against a similarly-toned page background.
  primary:
    "glass-button bg-gradient-to-r from-primary to-primaryEnd text-primary-foreground hover:shadow-lg hover:shadow-primary/30",
  // Secondary is a glass button (translucent, rimmed, softly blurred); danger keeps its solid colour but gets the same gloss as primary.
  secondary: "glass-control text-fg hover:border-primary/50",
  danger: "glass-button bg-danger text-danger-foreground hover:opacity-90",
};

/** The look of a button, for things that must be a link (<a>) but should read as a button. */
export function buttonClassName(variant: ButtonVariant = "primary", extra = ""): string {
  return `inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium transition-all duration-150 ease-out
    active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
    disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${extra}`;
}

/**
 * Design-system primitive - reused across pages instead of one-off button styles
 * (CLAUDE.md section 26). Add the remaining primitives (Input, Select, Modal, Table,
 * Card, Badge, Toast, Alert, Pagination, Loading, EmptyState) here following this
 * same shape as real screens need them.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading = false, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={buttonClassName(variant, className)}
        {...props}
      >
        {loading && (
          <span aria-hidden className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
