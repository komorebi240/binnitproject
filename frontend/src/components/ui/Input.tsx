import { type InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Design-system primitive (CLAUDE.md section 26). Always renders a visible <label> tied to
 * the input via id - screen readers and click-to-focus depend on that pairing, not just
 * placeholder text (CLAUDE.md section 27).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`rounded border px-3 py-2 text-sm transition-colors duration-150
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? "border-danger" : "border-gray-300 hover:border-gray-400"} ${className}`}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
