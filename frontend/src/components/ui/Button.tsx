import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-surface-muted text-gray-900 hover:bg-gray-200",
  danger: "bg-danger text-danger-foreground hover:opacity-90",
};

/**
 * Design-system primitive — reused across pages instead of one-off button styles
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
        className={`inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium
          transition-all duration-150 ease-out active:scale-95 focus-visible:outline focus-visible:outline-2
          focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed
          disabled:opacity-50 disabled:active:scale-100
          ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      >
        {loading ? "..." : children}
      </button>
    );
  },
);

Button.displayName = "Button";
