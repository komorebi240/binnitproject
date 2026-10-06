export type Locale = "vi" | "en";

export const LOCALES: Locale[] = ["vi", "en"];

/** Vietnamese is the default language of the product and lives at the root; English lives under /en. */
export const LOCALE_PATH: Record<Locale, string> = { vi: "/", en: "/en" };

/** How each language names itself in the language switch (never translated: people look for their own language). */
export const LOCALE_NAME: Record<Locale, string> = { vi: "Tiếng Việt", en: "English" };

/** The paths of the marketing page in every language; the middleware lets them through for everyone. */
export const MARKETING_PATHS: string[] = LOCALES.map((locale) => LOCALE_PATH[locale]);
