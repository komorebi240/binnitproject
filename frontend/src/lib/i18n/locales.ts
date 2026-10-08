/** The languages of the product. Vietnamese is the default; a language is chosen in the browser and remembered there. */
export type Locale = "vi" | "en";

export const LOCALES: Locale[] = ["vi", "en"];

export const DEFAULT_LOCALE: Locale = "vi";

/** How each language names itself in the language switch (never translated: people look for their own language). */
export const LOCALE_NAME: Record<Locale, string> = { vi: "Tiếng Việt", en: "English" };

/** The BCP 47 tag `Intl` wants for dates and numbers. */
export const INTL_LOCALE: Record<Locale, string> = { vi: "vi-VN", en: "en-US" };

export function isLocale(value: unknown): value is Locale {
  return value === "vi" || value === "en";
}
