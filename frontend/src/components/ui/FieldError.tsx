"use client";

import { useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { describeInvalidField } from "@/lib/fieldValidation";
import { useI18n } from "@/lib/i18n/useI18n";

/**
 * The message under a form field. A role="alert" so a screen reader announces it, and an icon plus text,
 * so the problem is not told by the red colour alone (CLAUDE.md section 27).
 */
export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="animate-fade-in flex items-start gap-1.5 text-sm text-danger"
    >
      <WarningCircle size={16} weight="fill" aria-hidden className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

type NativeField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Replaces the browser's own validation bubble (in the browser's language, unstyled) with a message in the app's language shown under the
 * field. `handleInvalid` goes on the control's onInvalid, `clear` on its change/input events. The first invalid
 * field of a form gets the focus, which the browser no longer does once its bubble is cancelled.
 */
export function useNativeValidationMessage(label: string) {
  const { t } = useI18n();
  const [message, setMessage] = useState<string | null>(null);

  function handleInvalid(event: React.FormEvent<NativeField>) {
    event.preventDefault();
    const field = event.currentTarget;
    const input = field instanceof HTMLInputElement ? field : null;
    setMessage(
      describeInvalidField(
        {
          validity: field.validity,
          type: input?.type ?? "select",
          isSelect: field instanceof HTMLSelectElement,
          minLength: input?.minLength ?? -1,
          maxLength: input?.maxLength ?? -1,
          min: input?.min ?? "",
          max: input?.max ?? "",
          validationMessage: field.validationMessage,
        },
        label,
        t,
      ),
    );
    if (field.form?.querySelector(":invalid") === field) {
      field.focus();
      field.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  return { message, handleInvalid, clear: () => setMessage(null) };
}
