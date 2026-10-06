"use client";

import { type InputHTMLAttributes, forwardRef, useId, useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { FieldError, useNativeValidationMessage } from "./FieldError";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** A message from the server or the caller; it wins over the browser's own validation message. */
  error?: string;
}

/**
 * Design-system primitive (CLAUDE.md section 26). Always renders a visible <label> tied to
 * the input via id - screen readers and click-to-focus depend on that pairing, not just
 * placeholder text (CLAUDE.md section 27). Problems found by the browser's built-in validation
 * (required, email, minLength...) show as a Vietnamese message under the field instead of the
 * native English bubble. Password fields get their own always-visible show/hide button (the browser's
 * built-in one only appears while the field is focused or hovered, so it seemed to come and go).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", type, onInvalid, onChange, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const validation = useNativeValidationMessage(label);
    const shownError = error ?? validation.message ?? undefined;
    const [revealed, setRevealed] = useState(false);
    const isPassword = type === "password";
    // Fill the row like a plain flex child did, unless the caller sets its own width (e.g. "w-32").
    const hasOwnWidth = /(^|\s)w-/.test(className);

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-fg-soft">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            type={isPassword && revealed ? "text" : type}
            id={inputId}
            aria-invalid={Boolean(shownError)}
            aria-describedby={shownError ? `${inputId}-error` : undefined}
            onInvalid={(event) => {
              validation.handleInvalid(event);
              onInvalid?.(event);
            }}
            onChange={(event) => {
              validation.clear();
              onChange?.(event);
            }}
            className={`rounded border bg-surface px-3 py-2 text-sm text-fg transition-colors duration-150
            focus-visible:outline focus-visible:outline-2 ${shownError ? "focus-visible:outline-danger" : "focus-visible:outline-primary"}
            disabled:cursor-not-allowed disabled:opacity-50
            ${shownError ? "border-danger" : "border-line-strong hover:border-fg-faint"}
            ${hasOwnWidth ? "" : "w-full"} ${isPassword ? "pr-10 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" : ""} ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              aria-label={revealed ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={revealed}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r text-fg-muted transition-colors duration-150 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {revealed ? <EyeSlash size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
          )}
        </div>
        {shownError && <FieldError id={`${inputId}-error`} message={shownError} />}
      </div>
    );
  },
);

Input.displayName = "Input";
