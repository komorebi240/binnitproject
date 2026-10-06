import type { Metadata } from "next";
import { COPY } from "./copy";
import { LOCALE_PATH, LOCALES, type Locale } from "./locales";

/** Where the site is published; search engines need absolute addresses for the language alternates. Set `SITE_URL` to change it. */
const SITE_URL = process.env.SITE_URL ?? "https://app.stayorbit.cloud";

/**
 * Title, description and language links of the marketing page in one language. Every language names all the others
 * as alternates (`hreflang`), and Vietnamese, the product's default language, is also the `x-default`.
 */
export function marketingMetadata(locale: Locale): Metadata {
  const { meta } = COPY[locale];
  const alternateLocales = LOCALES.filter((code) => code !== locale).map((code) => COPY[code].meta.ogLocale);
  return {
    metadataBase: new URL(SITE_URL),
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: LOCALE_PATH[locale],
      languages: {
        ...Object.fromEntries(LOCALES.map((code) => [code, LOCALE_PATH[code]])),
        "x-default": LOCALE_PATH.vi,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: "website",
      siteName: "Orbit",
      url: LOCALE_PATH[locale],
      locale: meta.ogLocale,
      alternateLocale: alternateLocales,
    },
  };
}
