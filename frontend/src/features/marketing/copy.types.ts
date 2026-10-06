import type { Locale } from "./locales";

export type TaskPriority = "high" | "medium" | "low";

export interface SampleTask {
  title: string;
  /** Initials of the person it is assigned to. */
  who: string;
  priority: TaskPriority;
}

export interface TitledText {
  title: string;
  text: string;
}

/**
 * Every word of the marketing page in one language. The two dictionaries (copy.vi.ts, copy.en.ts) must have this exact
 * shape, so a line added to one cannot be forgotten in the other (the compiler says so; marketing.test.ts also checks
 * that lists have the same length in both). Icons are not part of the copy: they live in content.tsx, by position.
 */
export interface MarketingCopy {
  locale: Locale;
  meta: { title: string; description: string; ogLocale: string };
  a11y: { skipToContent: string; backToTop: string; sections: string; footerLinks: string; glimpse: string };
  /** Anchors of the page's sections, in the order of the menu. The ids are the same in every language. */
  nav: { href: string; label: string }[];
  header: { signIn: string; start: string };
  hero: {
    eyebrow: string;
    titleBefore: string;
    titleEmphasis: string;
    text: string;
    primaryCta: string;
    secondaryCta: string;
    hasAccount: string;
    signIn: string;
  };
  glimpse: {
    windowTitle: string;
    caption: string;
    priority: Record<TaskPriority, string>;
    columns: { name: string; tasks: SampleTask[] }[];
  };
  problem: { eyebrow: string; title: string; text: string; offTitle: string; off: string[]; inTitle: string; in: string[] };
  features: { eyebrow: string; title: string; text: string; items: TitledText[] };
  steps: { eyebrow: string; title: string; items: TitledText[] };
  roles: { eyebrow: string; title: string; text: string; items: { name: string; text: string }[] };
  security: { eyebrow: string; title: string; text: string; items: string[] };
  finalCta: { title: string; text: string; primary: string; secondary: string };
}
