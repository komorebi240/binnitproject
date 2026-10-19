"use client";

import { CalendarPlus, ClipboardText } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useI18n } from "@/lib/i18n/useI18n";
import type { TextAnalysis } from "../analyzeText";

interface AnalysisViewProps {
  analysis: TextAnalysis;
  onCopy: (value: string) => void;
  onCreateTask: () => void;
  onCreateEvent: () => void;
}

/** A link as something safe to open: only web addresses, "www." ones made explicit. */
function webHref(link: string): string | null {
  if (/^https?:\/\//i.test(link)) return link;
  if (/^www\./i.test(link)) return `https://${link}`;
  return null;
}

/**
 * What analyzeText found, grouped by kind. Each finding copies itself when clicked (links open instead); the suggestions
 * open the usual "add a task" / "add an event" forms already filled in from the text.
 */
export function AnalysisView({ analysis, onCopy, onCreateTask, onCreateEvent }: AnalysisViewProps) {
  const { t, intlLocale } = useI18n();
  const dateLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(intlLocale, { dateStyle: "medium" });
  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(intlLocale, { style: "currency", currency, maximumFractionDigits: currency === "VND" ? 0 : 2 }).format(amount);

  const groups: Array<{ key: TranslationKey; items: Array<{ label: string; value: string; href?: string | null }> }> = [
    { key: "smartSelect.analysis.dates", items: analysis.dates.map((d) => ({ label: `${d.text} → ${dateLabel(d.date)}`, value: d.date })) },
    { key: "smartSelect.analysis.times", items: analysis.times.map((time) => ({ label: `${time.text} → ${time.time}`, value: time.time })) },
    { key: "smartSelect.analysis.emails", items: analysis.emails.map((email) => ({ label: email, value: email })) },
    { key: "smartSelect.analysis.phones", items: analysis.phones.map((phone) => ({ label: phone, value: phone })) },
    { key: "smartSelect.analysis.links", items: analysis.links.map((link) => ({ label: link, value: link, href: webHref(link) })) },
    {
      key: "smartSelect.analysis.money",
      items: analysis.money.map((m) => ({ label: `${m.text} → ${money(m.amount, m.currency)}`, value: String(m.amount) })),
    },
    { key: "smartSelect.analysis.numbers", items: analysis.numbers.map((n) => ({ label: n, value: n })) },
  ];
  const found = groups.filter((group) => group.items.length > 0);
  const chip =
    "max-w-full truncate rounded border border-line bg-surface px-2 py-1 text-left text-xs text-fg transition-colors duration-150 hover:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-fg-muted">
        {t("smartSelect.analysis.stats", {
          characters: analysis.stats.characters,
          words: analysis.stats.words,
          lines: analysis.stats.lines,
        })}
      </p>

      {found.length === 0 ? (
        <p className="text-sm text-fg-muted">{t("smartSelect.analysis.nothingFound")}</p>
      ) : (
        <dl className="flex flex-col gap-2">
          {found.map((group) => (
            <div key={group.key} className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-fg-soft">{t(group.key)}</dt>
              <dd className="flex flex-wrap gap-1">
                {group.items.map((item, index) =>
                  item.href ? (
                    <a key={index} href={item.href} target="_blank" rel="noopener noreferrer" className={chip}>
                      {item.label}
                    </a>
                  ) : (
                    <button key={index} type="button" onClick={() => onCopy(item.value)} title={t("smartSelect.analysis.clickToCopy")} className={chip}>
                      {item.label}
                    </button>
                  ),
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <p className="text-xs text-fg-muted">
          {analysis.suggestion.date ? t("smartSelect.analysis.suggestWithDate") : t("smartSelect.analysis.suggestWithoutDate")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onCreateTask}>
            <ClipboardText size={16} aria-hidden className="mr-1.5" />
            {t("smartSelect.analysis.createTask")}
          </Button>
          <Button variant="secondary" onClick={onCreateEvent}>
            <CalendarPlus size={16} aria-hidden className="mr-1.5" />
            {t("smartSelect.analysis.createEvent")}
          </Button>
        </div>
      </div>
    </div>
  );
}
