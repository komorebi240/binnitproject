"use client";

import { useState } from "react";
import { RichText } from "@/components/i18n/RichText";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n/useI18n";
import { useCurrentTerms } from "../hooks/useTerms";
import { TermsDocument } from "./TermsDocument";

/**
 * The checkbox every sign-up form shows ("I have read and accept the Terms of Service"), with the terms one click away in
 * a window. The form reads the version being accepted from `useCurrentTerms()` and sends it with the request; the server
 * refuses an account whose version is not the newest.
 */
export function TermsAgreement({ agreed, onChange }: { agreed: boolean; onChange: (agreed: boolean) => void }) {
  const { t } = useI18n();
  const { data: terms, isLoading } = useCurrentTerms();
  const [reading, setReading] = useState(false);

  if (isLoading || !terms) {
    return <p className="text-xs text-fg-muted">{t("legal.agreement.loading")}</p>;
  }

  return (
    <>
      <label className="flex items-start gap-2 text-sm text-fg-soft">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong accent-primary"
        />
        <span>
          <RichText
            text={t("legal.agreement.text")}
            values={{
              terms: (
                <button
                  type="button"
                  onClick={() => setReading(true)}
                  className="font-medium text-primary-text underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {t("legal.agreement.link")}
                </button>
              ),
            }}
          />
        </span>
      </label>
      {reading && (
        <Modal title={terms.title} onClose={() => setReading(false)} widthClassName="max-w-2xl">
          <TermsDocument terms={terms} />
        </Modal>
      )}
    </>
  );
}
