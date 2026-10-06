import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { XCircle } from "@phosphor-icons/react/dist/ssr/XCircle";
import { OrbitWordmark } from "@/components/brand/OrbitWordmark";
import { Tagline } from "@/components/brand/Tagline";
import { COPY, type MarketingCopy } from "./copy";
import { FEATURE_ICONS } from "./icons";
import { LandingCta } from "./LandingCta";
import { LOCALE_NAME, LOCALE_PATH, LOCALES, type Locale } from "./locales";
import { OrbitScene } from "./OrbitScene";
import { ProductGlimpse } from "./ProductGlimpse";

const BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";
const BUTTON_PRIMARY = `${BUTTON} glass-button bg-gradient-to-r from-primary to-primaryEnd text-primary-foreground hover:shadow-xl hover:shadow-primary/40`;
const BUTTON_SECONDARY = `${BUTTON} glass-control text-fg hover:text-primary-text`;
const BUTTON_LARGE = "px-8 py-3.5 text-base";
const BUTTON_SMALL = "px-5 py-2 text-sm";
const CONTAINER = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const LINK_FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

function SectionHeading({ id, eyebrow, title, text }: { id: string; eyebrow: string; title: string; text?: string }) {
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
      <div className="mk-scene-wrap" aria-hidden>
        <OrbitScene />
      </div>
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

function ProblemSolution({ copy }: { copy: MarketingCopy }) {
  const { problem } = copy;
  return (
    <section id="solutions" aria-labelledby="solutions-title" className="mk-section scroll-mt-20 py-20 sm:py-24">
      <div className={CONTAINER}>
        <div className="mk-reveal">
          <SectionHeading id="solutions-title" eyebrow={problem.eyebrow} title={problem.title} text={problem.text} />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="glass-card mk-reveal rounded-2xl p-6 sm:p-8">
            <h3 className="mb-5 text-lg font-semibold text-fg">{problem.offTitle}</h3>
            <ul className="flex flex-col gap-4">
              {problem.off.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-relaxed text-fg-soft sm:text-base">
                  <XCircle aria-hidden size={22} weight="fill" className="mt-0.5 shrink-0 text-danger" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-card mk-reveal rounded-2xl p-6 sm:p-8">
            <h3 className="mb-5 text-lg font-semibold text-fg">{problem.inTitle}</h3>
            <ul className="flex flex-col gap-4">
              {problem.in.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-relaxed text-fg-soft sm:text-base">
                  <CheckCircle aria-hidden size={22} weight="fill" className="mt-0.5 shrink-0 text-success" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
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
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.items.map(({ title, text }, index) => {
            const Icon = FEATURE_ICONS[index]!;
            return (
              <li key={title} className="glass-card mk-reveal rounded-2xl p-6">
                <span className="glass-control mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-primary-text">
                  <Icon aria-hidden size={24} />
                </span>
                <h3 className="text-lg font-semibold text-fg">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-soft">{text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function HowItWorks({ copy }: { copy: MarketingCopy }) {
  const { steps } = copy;
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className="mk-section scroll-mt-20 py-20 sm:py-24">
      <div className={CONTAINER}>
        <div className="mk-reveal">
          <SectionHeading id="how-it-works-title" eyebrow={steps.eyebrow} title={steps.title} />
        </div>
        <ol className="grid gap-5 md:grid-cols-3">
          {steps.items.map((step, index) => (
            <li key={step.title} className="glass-card mk-reveal relative rounded-2xl p-6 sm:p-8">
              <span aria-hidden className="glass-button mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primaryEnd text-lg font-bold text-primary-foreground">
                {index + 1}
              </span>
              <h3 className="text-lg font-semibold text-fg">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-soft">{step.text}</p>
            </li>
          ))}
        </ol>
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
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {roles.items.map((role) => (
            <li key={role.name} className="glass-card mk-reveal rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-fg">{role.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-soft">{role.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Security({ copy }: { copy: MarketingCopy }) {
  const { security } = copy;
  return (
    <section id="security" aria-labelledby="security-title" className="mk-section scroll-mt-20 py-20 sm:py-24">
      <div className={CONTAINER}>
        <div className="glass-window mk-reveal grid gap-8 rounded-3xl p-8 sm:p-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary-text">{security.eyebrow}</p>
            <h2 id="security-title" className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
              {security.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-fg-soft">{security.text}</p>
          </div>
          <ul className="flex flex-col gap-4">
            {security.items.map((line) => (
              <li key={line} className="flex gap-3 text-sm leading-relaxed text-fg-soft sm:text-base">
                <ShieldCheck aria-hidden size={22} weight="fill" className="mt-0.5 shrink-0 text-primary-text" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FinalCta({ copy }: { copy: MarketingCopy }) {
  const { finalCta } = copy;
  return (
    <section aria-labelledby="cta-title" className="mk-section px-5 py-20 sm:py-28">
      <div className="glass-card mk-reveal relative isolate mx-auto flex max-w-4xl flex-col items-center overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12 sm:py-20">
        <h2 id="cta-title" className="text-3xl font-bold tracking-tight text-fg sm:text-5xl">
          {finalCta.title}
        </h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-fg-soft sm:text-lg">{finalCta.text}</p>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <LandingCta className={`${BUTTON_PRIMARY} ${BUTTON_LARGE}`}>
            {finalCta.primary}
            <ArrowRight aria-hidden size={18} weight="bold" />
          </LandingCta>
          <Link href="/login?open=login" className={`${BUTTON_SECONDARY} ${BUTTON_LARGE}`}>
            {finalCta.secondary}
          </Link>
        </div>
        <Tagline className="mt-10" />
      </div>
    </section>
  );
}

function Footer({ copy }: { copy: MarketingCopy }) {
  return (
    <footer className="border-t border-line">
      <div className={`${CONTAINER} flex flex-col items-center justify-between gap-6 py-10 sm:flex-row`}>
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <OrbitWordmark width={104} />
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
      <p className="pb-8 text-center text-xs text-fg-muted">© {new Date().getFullYear()} Orbit</p>
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
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-fg">
        {copy.a11y.skipToContent}
      </a>
      <Header copy={copy} />
      <main id="content">
        <Hero copy={copy} />
        <section aria-label={copy.a11y.glimpse} className="px-5 pb-8 sm:px-8">
          <div className="mk-reveal">
            <ProductGlimpse copy={copy.glimpse} />
          </div>
        </section>
        <ProblemSolution copy={copy} />
        <Features copy={copy} />
        <HowItWorks copy={copy} />
        <Roles copy={copy} />
        <Security copy={copy} />
        <FinalCta copy={copy} />
      </main>
      <Footer copy={copy} />
    </div>
  );
}
