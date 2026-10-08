"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { MARKETING_PATHS } from "@/features/marketing/locales";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";
import { LOCALE_STORAGE_KEY, readStoredLocale, rememberLocale } from "@/lib/i18n/storage";
import { translate } from "@/lib/i18n/translate";
import { I18nContext, type I18n } from "@/lib/i18n/useI18n";
import { VI } from "@/lib/i18n/vi";

// useLayoutEffect warns during server rendering; the effect is client-only anyway.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Vietnamese is in the main bundle (the default); English is fetched once, the first time it is needed. */
async function loadDictionary(locale: Locale): Promise<Dictionary> {
  if (locale === "vi") return VI;
  return (await import("@/lib/i18n/en")).EN;
}

/**
 * Holds the language of the whole product. It starts in Vietnamese (what the server renders), and before the first paint
 * switches to the language remembered in this browser; while the English texts are being fetched the page is not drawn,
 * so there is no flash of Vietnamese. The marketing pages have their own texts per address (/ and /en), so they neither
 * wait for a dictionary nor follow the stored choice - but when a visitor leaves one for the sign-in page, the stored
 * choice (set by the page's own language) is applied.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onMarketingPage = MARKETING_PATHS.includes(pathname);
  const [current, setCurrent] = useState<{ locale: Locale; messages: Dictionary }>({ locale: DEFAULT_LOCALE, messages: VI });
  const [ready, setReady] = useState(true);

  const apply = useCallback(async (locale: Locale) => {
    const messages = await loadDictionary(locale);
    setCurrent({ locale, messages });
    document.documentElement.lang = locale;
    setReady(true);
  }, []);

  // Follows the stored choice wherever the app (not a marketing page) is shown.
  useIsomorphicLayoutEffect(() => {
    if (onMarketingPage) return;
    const stored = readStoredLocale() ?? DEFAULT_LOCALE;
    if (stored === current.locale) return;
    setReady(stored === "vi");
    void apply(stored);
    // `current.locale` is deliberately not a dependency: this runs when the page kind changes, not after each switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMarketingPage, apply]);

  // Another tab changed the language: follow it.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === LOCALE_STORAGE_KEY && isLocale(event.newValue) && !onMarketingPage) void apply(event.newValue);
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [apply, onMarketingPage]);

  const setLocale = useCallback(
    (locale: Locale) => {
      rememberLocale(locale);
      void apply(locale);
    },
    [apply],
  );

  const value = useMemo<I18n>(
    () => ({
      locale: current.locale,
      intlLocale: INTL_LOCALE[current.locale],
      t: (key, params) => translate(current.locale, current.messages, VI, key, params),
      setLocale,
    }),
    [current, setLocale],
  );

  return <I18nContext.Provider value={value}>{ready ? children : null}</I18nContext.Provider>;
}
