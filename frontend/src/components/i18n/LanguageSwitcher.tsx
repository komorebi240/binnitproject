"use client";

import { LOCALE_NAME, LOCALES } from "@/lib/i18n/locales";
import { useI18n } from "@/lib/i18n/useI18n";

/**
 * The language switch of the sign-in pages and the app: "VI | EN", the current language filled in. Each button names its
 * language in that language (so someone who cannot read the current one can still find theirs). The choice is remembered
 * in this browser and applies to the marketing page, the sign-in pages and the app alike.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <div role="group" aria-label="Language / Ngôn ngữ" className={`flex items-center rounded-full border border-line-strong bg-surface/70 p-0.5 text-xs font-semibold ${className}`}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-label={LOCALE_NAME[code]}
          aria-pressed={code === locale}
          onClick={() => setLocale(code)}
          className={`rounded-full px-2.5 py-1 uppercase transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
            code === locale ? "bg-primary-text text-primary-foreground" : "text-fg-soft hover:text-primary-text"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
