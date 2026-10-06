import { EN } from "./copy.en";
import type { MarketingCopy } from "./copy.types";
import type { Locale } from "./locales";
import { VI } from "./copy.vi";

export type { MarketingCopy } from "./copy.types";

export const COPY: Record<Locale, MarketingCopy> = { vi: VI, en: EN };
