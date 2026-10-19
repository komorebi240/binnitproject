"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useI18n } from "@/lib/i18n/useI18n";

interface Component {
  name: string;
  license: string;
  /** The copyright line, where the licence asks for it to be shown and it was checked against the project. */
  copyright?: string;
  usedForKey: TranslationKey;
  url: string;
}

/** What the people using Orbit see working; everything else is in the full notices file. */
const COMPONENTS: Component[] = [
  {
    name: "Excalidraw",
    license: "MIT",
    copyright: "Copyright (c) 2020 Excalidraw",
    usedForKey: "legal.licenses.usedFor.whiteboards",
    url: "https://github.com/excalidraw/excalidraw",
  },
  { name: "docx-preview", license: "Apache-2.0", usedForKey: "legal.licenses.usedFor.wordFiles", url: "https://github.com/VolodymyrBaydalka/docxjs" },
  { name: "read-excel-file", license: "MIT", usedForKey: "legal.licenses.usedFor.excelFiles", url: "https://gitlab.com/catamphetamine/read-excel-file" },
  { name: "JSZip", license: "MIT", usedForKey: "legal.licenses.usedFor.wordFiles", url: "https://github.com/Stuk/jszip" },
  { name: "Next.js", license: "MIT", usedForKey: "legal.licenses.usedFor.app", url: "https://github.com/vercel/next.js" },
  { name: "React", license: "MIT", usedForKey: "legal.licenses.usedFor.app", url: "https://github.com/facebook/react" },
  { name: "TanStack Query", license: "MIT", usedForKey: "legal.licenses.usedFor.app", url: "https://github.com/TanStack/query" },
  { name: "Axios", license: "MIT", usedForKey: "legal.licenses.usedFor.app", url: "https://github.com/axios/axios" },
  { name: "Zod", license: "MIT", usedForKey: "legal.licenses.usedFor.app", url: "https://github.com/colinhacks/zod" },
  { name: "Phosphor Icons", license: "MIT", usedForKey: "legal.licenses.usedFor.icons", url: "https://github.com/phosphor-icons/react" },
  { name: "GSAP", license: "GSAP Standard License", usedForKey: "legal.licenses.usedFor.motion", url: "https://gsap.com/standard-license" },
];

/** The fonts the whiteboard draws with; each font file carries its own copyright and licence notice. */
const FONTS: Array<{ name: string; license: string; copyright?: string }> = [
  { name: "Excalifont, Virgil", license: "SIL Open Font License 1.1" },
  { name: "Nunito, Lilita One, Assistant", license: "SIL Open Font License 1.1" },
  { name: "Cascadia Code", license: "SIL Open Font License 1.1" },
  { name: "Liberation Sans", license: "SIL Open Font License 1.1" },
  { name: "Xiaolai", license: "SIL Open Font License 1.1" },
  { name: "Comic Shanns", license: "MIT", copyright: "Copyright (c) 2018 Shannon Miwa" },
];

const linkClassName =
  "inline-flex items-center gap-1 text-primary-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

/**
 * Credit to the open-source projects Orbit is built with: the main ones by name with their licence, the whiteboard's
 * fonts, and a link to the full notices of every package shipped to the browser (generated at build time).
 */
export function OpenSourceLicenses() {
  const { t } = useI18n();
  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold text-fg">{t("legal.licenses.title")}</h1>
        <p className="text-sm text-fg-muted">{t("legal.licenses.intro")}</p>
      </header>

      <div className="overflow-x-auto rounded glass-card">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-fg-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">{t("legal.licenses.component")}</th>
              <th scope="col" className="px-4 py-2 font-medium">{t("legal.licenses.usedForHeader")}</th>
              <th scope="col" className="px-4 py-2 font-medium">{t("legal.licenses.license")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {COMPONENTS.map((component) => (
              <tr key={component.name}>
                <td className="px-4 py-2 align-top">
                  <a href={component.url} target="_blank" rel="noopener noreferrer" className={linkClassName}>
                    {component.name}
                    <ArrowSquareOut size={12} aria-hidden />
                  </a>
                  {component.copyright && <span className="block text-xs text-fg-muted">{component.copyright}</span>}
                </td>
                <td className="px-4 py-2 align-top text-fg-soft">{t(component.usedForKey)}</td>
                <td className="px-4 py-2 align-top text-fg-soft">{component.license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-1 text-base font-semibold text-fg">{t("legal.licenses.fontsTitle")}</h2>
        <p className="mb-2 text-sm text-fg-muted">{t("legal.licenses.fontsIntro")}</p>
        <ul className="flex flex-col gap-1 text-sm text-fg-soft">
          {FONTS.map((font) => (
            <li key={font.name}>
              <span className="text-fg">{font.name}</span> - {font.license}
              {font.copyright && <span className="text-fg-muted"> ({font.copyright})</span>}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-fg-soft">
        <a href="/third-party-licenses.txt" target="_blank" rel="noopener" className={linkClassName}>
          {t("legal.licenses.fullNotices")}
          <ArrowSquareOut size={12} aria-hidden />
        </a>
      </p>
    </section>
  );
}
