import { LOCALES, type Locale } from "@/lib/i18n/locales";

export { LOCALE_NAME, LOCALES, type Locale } from "@/lib/i18n/locales";

/** Vietnamese is the default language of the product and lives at the root; English lives under /en. */
export const LOCALE_PATH: Record<Locale, string> = { vi: "/", en: "/en" };

/** The paths of the marketing page in every language; the middleware lets them through for everyone. */
export const MARKETING_PATHS: string[] = LOCALES.map((locale) => LOCALE_PATH[locale]);
