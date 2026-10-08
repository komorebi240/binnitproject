"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n/locales";
import { rememberLocale } from "@/lib/i18n/storage";

/**
 * A marketing page's language is its address (/ or /en), so a visitor who got here by choosing a language - or by a
 * shared link - expects the sign-in page and the app that follow to speak it too. This remembers it in the browser; the
 * English texts are fetched in the background so the sign-in page opens at once. Renders nothing.
 */
export function LocaleRemember({ locale }: { locale: Locale }) {
  useEffect(() => {
    rememberLocale(locale);
    if (locale === "en") void import("@/lib/i18n/en");
  }, [locale]);
  return null;
}
