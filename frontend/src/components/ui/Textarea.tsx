"use client";

import { type TextareaHTMLAttributes, forwardRef, useId } from "react";
import { FieldError, useNativeValidationMessage } from "./FieldError";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  /** Keep the label for screen readers only (for compact spots such as a floating note). */
  hideLabel?: boolean;
  /** A message from the server or the caller; it wins over the browser's own validation message. */
  error?: string;
}

/**
 * Design-system primitive (CLAUDE.md section 26), the multi-line sibling of Input: a visible (or screen-reader-only)
 * label tied to the field, the same validation messages in Vietnamese, and a live "n/max" counter whenever a
 * `maxLength` is set.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hideLabel = false, error, id, className = "", onInvalid, onChange, value, maxLength, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const validation = useNativeValidationMessage(label);
    const shownError = error ?? validation.message ?? undefined;
    const length = typeof value === "string" ? value.length : 0;

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={textareaId} className={hideLabel ? "sr-only" : "text-sm font-medium text-fg-soft"}>
          {label}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          aria-invalid={Boolean(shownError)}
          aria-describedby={shownError ? `${textareaId}-error` : undefined}
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
            ${shownError ? "border-danger" : "border-line-strong hover:border-fg-faint"} ${className}`}
          {...props}
        />
        {maxLength !== undefined && typeof value === "string" && (
          <span className="self-end text-xs text-fg-faint" aria-hidden>
            {length}/{maxLength}
          </span>
        )}
        {shownError && <FieldError id={`${textareaId}-error`} message={shownError} />}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
