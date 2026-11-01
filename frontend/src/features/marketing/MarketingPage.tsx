import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { OrbitWordmark } from "@/components/brand/OrbitWordmark";
import { Tagline } from "@/components/brand/Tagline";
import { COPY, type MarketingCopy } from "./copy";
import { FeatureStacks, ScrollSteps } from "./MarketingInteractions";
import { LandingCta } from "./LandingCta";
import { LocaleRemember } from "./LocaleRemember";
import { LOCALE_NAME, LOCALE_PATH, LOCALES, type Locale } from "./locales";
import { StoryBackground, SolutionPanels } from "./MarketingStory";
import { RolesMap } from "./RolesMap";
import { ProductGlimpse } from "./ProductGlimpse";

const BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";
const BUTTON_PRIMARY = `${BUTTON} glass-button bg-gradient-to-r from-primary to-primaryEnd text-primary-foreground hover:shadow-xl hover:shadow-primary/40`;
const BUTTON_SECONDARY = `${BUTTON} glass-control text-fg hover:text-primary-text`;
const BUTTON_LARGE = "px-8 py-3.5 text-base";
const BUTTON_SMALL = "px-5 py-2 text-sm";
const CONTAINER = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const LINK_FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

function SectionHeading({ id, eyebrow, title, text }: { id: string; eyebrow: string; title: ReactNode; text?: ReactNode }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary-text">{eyebrow}</p>
      <h2 id={id} className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-base leading-relaxed text-fg-soft">{text}</p>}
    </div>
  );
}

/**
 * Switches between the page's languages. Each language is its own address (/ and /en), so this is plain links: it
 * works without script, search engines can follow it, and a language can be shared by link.
 */
function LanguageSwitch({ locale }: { locale: Locale }) {
  return (
    <ul className="flex items-center rounded-full border border-line-strong bg-surface/70 p-0.5 text-xs font-semibold">
      {LOCALES.map((code) => (
        <li key={code}>
          <Link
            href={LOCALE_PATH[code]}
            lang={code}
            hrefLang={code}
            aria-label={LOCALE_NAME[code]}
            aria-current={code === locale ? "true" : undefined}
            className={`block rounded-full px-2.5 py-1 uppercase transition-colors duration-150 ${LINK_FOCUS} ${
              code === locale ? "bg-primary-text text-primary-foreground" : "text-fg-soft hover:text-primary-text"
            }`}
          >
            {code}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Header({ copy }: { copy: MarketingCopy }) {
  return (
    <header className="glass-window sticky top-0 z-30 rounded-none border-0 border-b">
      <div className={`${CONTAINER} flex h-16 items-center justify-between gap-3`}>
        <Link href={LOCALE_PATH[copy.locale]} aria-label={copy.a11y.backToTop} className={`shrink-0 rounded ${LINK_FOCUS}`}>
          <OrbitWordmark width={112} />
        </Link>
        <nav aria-label={copy.a11y.sections} className="hidden items-center gap-7 md:flex">
          {copy.nav.map((link) => (
            <a key={link.href} href={link.href} className={`text-sm font-medium text-fg-soft transition-colors duration-150 hover:text-primary-text ${LINK_FOCUS}`}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageSwitch locale={copy.locale} />
          <Link href="/login?open=login" className={`hidden rounded px-2 py-1 text-sm font-medium text-fg-soft transition-colors duration-150 hover:text-primary-text sm:block ${LINK_FOCUS}`}>
            {copy.header.signIn}
          </Link>
          <LandingCta className={`${BUTTON_PRIMARY} ${BUTTON_SMALL}`}>{copy.header.start}</LandingCta>
        </div>
      </div>
    </header>
  );
}

function Hero({ copy }: { copy: MarketingCopy }) {
  const { hero } = copy;
  return (
    <section aria-labelledby="hero-title" className="relative isolate flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden px-5 py-20">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <p className="animate-rise-in mb-6 inline-flex items-center gap-2 rounded-full glass-control px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary-text">
          {hero.eyebrow}
        </p>
        <h1 id="hero-title" className="animate-rise-in text-4xl font-bold leading-[1.1] tracking-tight text-fg [animation-delay:80ms] sm:text-5xl lg:text-6xl">
          {hero.titleBefore}{" "}
          <span className="bg-gradient-to-r from-primary-text to-primaryEnd bg-clip-text text-transparent">{hero.titleEmphasis}</span>
        </h1>
        <p className="animate-rise-in mx-auto mt-6 max-w-2xl text-base leading-relaxed text-fg-soft [animation-delay:160ms] sm:text-lg">
          {hero.text}
        </p>
        <div className="animate-rise-in mt-9 flex flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row sm:gap-4">
          <LandingCta className={`${BUTTON_PRIMARY} ${BUTTON_LARGE}`}>
            {hero.primaryCta}
            <ArrowRight aria-hidden size={18} weight="bold" />
          </LandingCta>
          <a href="#features" className={`${BUTTON_SECONDARY} ${BUTTON_LARGE}`}>
            {hero.secondaryCta}
          </a>
        </div>
        <p className="animate-rise-in mt-6 text-sm text-fg-muted [animation-delay:320ms]">
          {hero.hasAccount}{" "}
          <Link href="/login?open=login" className={`font-medium text-primary-text hover:underline ${LINK_FOCUS}`}>
            {hero.signIn}
          </Link>
        </p>
        <Tagline className="animate-rise-in mt-12 [animation-delay:400ms]" />
      </div>
    </section>
  );
}

function emphasize(text: string, phrase: string, className: string) {
  const at = text.indexOf(phrase);
  if (at < 0) return text;
  return <>{text.slice(0, at)}<span className={className}>{phrase}</span>{text.slice(at + phrase.length)}</>;
}

function ProblemSolution({ copy }: { copy: MarketingCopy }) {
  const { problem } = copy;
  return (
    <section id="solutions" aria-labelledby="solutions-title" className="mk-section scroll-mt-20 py-20 sm:py-24">
      <div className={CONTAINER}>
        <SolutionPanels problem={problem} heading={
          <div className="mk-story-heading"><SectionHeading id="solutions-title" eyebrow={problem.eyebrow}
            title={emphasize(problem.title, copy.locale === "vi" ? "lệch quỹ đạo" : "drift off orbit", "mk-off-orbit")}
            text={emphasize(problem.text, copy.locale === "vi" ? "Orbit đặt tất cả vào một trung tâm." : "Orbit puts everything around one center.", "mk-orbit-center")} /></div>
        } />
      </div>
    </section>
  );
}

function Features({ copy }: { copy: MarketingCopy }) {
  const { features } = copy;
  return (
    <section id="features" aria-labelledby="features-title" className="mk-section scroll-mt-20 py-20 sm:py-24">
      <div className={CONTAINER}>
        <div className="mk-reveal">
          <SectionHeading id="features-title" eyebrow={features.eyebrow} title={features.title} text={features.text} />
        </div>
        <FeatureStacks copy={copy} />
      </div>
    </section>
  );
}

function HowItWorks({ copy }: { copy: MarketingCopy }) {
  const { steps } = copy;
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className="mk-section scroll-mt-20 py-20 sm:py-24">
      <div className={CONTAINER}>
        <ScrollSteps steps={steps.items} heading={<div className="mk-story-heading"><SectionHeading id="how-it-works-title" eyebrow={steps.eyebrow} title={steps.title} /></div>} />
      </div>
    </section>
  );
}

function Roles({ copy }: { copy: MarketingCopy }) {
  const { roles } = copy;
  return (
    <section id="roles" aria-labelledby="roles-title" className="mk-section scroll-mt-20 py-20 sm:py-24">
      <div className={CONTAINER}>
        <div className="mk-reveal">
          <SectionHeading id="roles-title" eyebrow={roles.eyebrow} title={roles.title} text={roles.text} />
        </div>
        <RolesMap roles={roles} />
      </div>
    </section>
  );
}

function Security({ copy }: { copy: MarketingCopy }) {
  const { security } = copy;
  return (
    <section id="security" aria-labelledby="security-title" className="mk-section scroll-mt-20 py-20 sm:py-24">
      <div className={CONTAINER}>
        <div className="mk-security-vault glass-window grid gap-10 rounded-3xl p-6 sm:p-12 lg:grid-cols-[.9fr_1.2fr] lg:items-center">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary-text">{security.eyebrow}</p>
            <h2 id="security-title" className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
              {security.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-fg-soft">{security.text}</p>
          </div>
          <ol className="mk-security-layers">
            {security.items.map((line, index) => (
              <li key={line}>
                <span className="mk-layer-number" aria-hidden>0{index + 1}</span><div><h3 className="font-semibold text-fg mb-1">{security.labels[index]}</h3><p>{line}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function FinalCta({ copy }: { copy: MarketingCopy }) {
  const { finalCta } = copy;
  return <section aria-labelledby="cta-title" className="mk-launch-section">
    <div className={`${CONTAINER} mk-launch-layout`}>
      <div className="mk-launch-copy">
        <p className="mk-launch-eyebrow">{copy.locale === "vi" ? "Chuyển động tiếp theo" : "Your next move"}</p>
        <h2 id="cta-title">{finalCta.title}</h2>
        <p className="mk-launch-description">{finalCta.text}</p>
        <Link href="/login?open=login" className="mk-launch-signin">{finalCta.secondary}<ArrowRight size={16} aria-hidden /></Link>
      </div>
      <div className="mk-launch-gate">
        <div className="mk-launch-orbits" aria-hidden><i /><i /><i /><span /></div>
        <OrbitWordmark width={168} />
        <LandingCta className="mk-launch-button">{finalCta.primary}<ArrowRight size={22} aria-hidden /></LandingCta>
        <Tagline />
      </div>
    </div>
  </section>;
}

function Footer({ copy }: { copy: MarketingCopy }) {
  return (
    <footer id="footer" className="mk-footer border-t border-line">
      <div className={`${CONTAINER} flex flex-col items-center justify-between gap-6 py-10 sm:flex-row`}>
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <OrbitWordmark width={144} />
          <Tagline />
        </div>
        <nav aria-label={copy.a11y.footerLinks} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          {copy.nav.map((link) => (
            <a key={link.href} href={link.href} className={`text-fg-soft hover:text-primary-text hover:underline ${LINK_FOCUS}`}>
              {link.label}
            </a>
          ))}
          <Link href="/login?open=login" className={`font-medium text-primary-text hover:underline ${LINK_FOCUS}`}>
            {copy.header.signIn}
          </Link>
        </nav>
      </div>
      <div className={`${CONTAINER} mk-footer-bottom`}><p>© {new Date().getFullYear()} Orbit</p><a href="#content">{copy.locale === "vi" ? "Về đầu trang ↑" : "Back to top ↑"}</a></div>
    </footer>
  );
}

/**
 * The public marketing page: what Orbit is, what it does for a business, and the way in. One component for every
 * language; the words come from the dictionary of `locale` (copy.vi.ts, copy.en.ts) and `lang` marks the page's
 * language for assistive tech and search engines.
 */
export function MarketingPage({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  return (
    <div className="mk-page" lang={locale}>
      <LocaleRemember locale={locale} />
      <StoryBackground />
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-fg">
        {copy.a11y.skipToContent}
      </a>
      <Header copy={copy} />
      <main id="content">
        <Hero copy={copy} />
        <section data-story-board aria-label={copy.a11y.glimpse} className="mk-board-journey px-5 pb-8 sm:px-8">
          <div className="mk-board-pin">
            <div className="mk-demo-heading"><SectionHeading id="demo-title" eyebrow={copy.glimpse.eyebrow} title={copy.glimpse.title} text={copy.glimpse.text} /></div>
            <ProductGlimpse copy={copy.glimpse} />
          </div>
        </section>
        <HowItWorks copy={copy} />
        <ProblemSolution copy={copy} />
        <Features copy={copy} />
        <Roles copy={copy} />
        <Security copy={copy} />
        <FinalCta copy={copy} />
      </main>
      <Footer copy={copy} />
    </div>
  );
}
