"use client";

import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api/client";
import { useUserKpiSummary } from "../hooks/useKpi";

import { useI18n } from "@/lib/i18n/useI18n";
/** Score bands that the badge and the meter both use: below 40 needs attention, 70 and up is good. */
const WARNING_FROM = 40;
const GOOD_FROM = 70;
const MAX_SCORE = 100;

function tierOf(score: number): { tone: "success" | "warning" | "danger"; barClassName: string } {
  if (score >= GOOD_FROM) return { tone: "success", barClassName: "bg-success" };
  if (score >= WARNING_FROM) return { tone: "warning", barClassName: "bg-warning" };
  return { tone: "danger", barClassName: "bg-danger" };
}

function ScoreMeter({ score }: { score: number }) {
  const { t } = useI18n();
  const clamped = Math.min(MAX_SCORE, Math.max(0, score));
  return (
    <div>
      <div
        role="meter"
        aria-label={t("kpi.userKpiPanel.kpiScore")}
        aria-valuemin={0}
        aria-valuemax={MAX_SCORE}
        aria-valuenow={clamped}
        aria-valuetext={t("kpi.userKpiPanel.clampedOutOfMaxScore", { clamped, MAX_SCORE })}
        className="relative h-2 rounded-full bg-line"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${tierOf(clamped).barClassName}`}
          style={{ width: `${clamped}%` }}
        />
        {[WARNING_FROM, GOOD_FROM].map((mark) => (
          <span
            key={mark}
            aria-hidden
            className="absolute top-0 h-full w-px bg-surface"
            style={{ left: `${mark}%` }}
          />
        ))}
      </div>
      <div aria-hidden className="relative mt-1 h-4 text-[11px] text-fg-faint">
        <span className="absolute left-0">0</span>
        {[WARNING_FROM, GOOD_FROM].map((mark) => (
          <span key={mark} className="absolute -translate-x-1/2" style={{ left: `${mark}%` }}>
            {mark}
          </span>
        ))}
        <span className="absolute right-0">{MAX_SCORE}</span>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  caption,
  percent,
}: {
  label: string;
  value: string;
  caption: string;
  percent?: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-xs font-medium text-fg-muted">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-fg">{value}</p>
      {percent !== undefined && (
        <div className="h-1 rounded-full bg-line" aria-hidden>
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      )}
      <p className="text-xs text-fg-muted">{caption}</p>
    </div>
  );
}

interface UserKpiPanelProps {
  userId: number;
}

/** The KPI tab of the staff management window: one headline score, then the three numbers behind it. */
export function UserKpiPanel({ userId }: UserKpiPanelProps) {
  const { t } = useI18n();
  const { data: summary, isLoading, isError, error } = useUserKpiSummary(userId, true);

  if (isLoading) {
    return <Skeleton rows={3} />;
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error instanceof ApiRequestError ? error.message : t("kpi.userKpiPanel.couldnTLoadTheKpi")}
      </p>
    );
  }
  if (!summary) return null;

  const period = t("kpi.userKpiPanel.monthPeriodmonthPeriodyear", { periodMonth: summary.periodMonth, periodYear: summary.periodYear });
  const completionRate = Math.round(summary.completionRatePercent);
  const onTimeRate = Math.round(summary.onTimeRatePercent);
  const tier = tierOf(summary.kpiScore);

  return (
    <section aria-label={t("kpi.userKpiPanel.fullnameSKpi", { fullName: summary.fullName })} className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-semibold text-fg">KPI {period.toLowerCase()}</h4>
        <p className="truncate text-xs text-fg-muted">{summary.fullName}</p>
      </div>

      {summary.totalAssigned === 0 ? (
        <div className="rounded border border-dashed border-line-strong px-4 py-8 text-center">
          <p className="text-sm font-medium text-fg-soft">
            {t("kpi.userKpiPanel.noTaskAssignedInPeriod", { period: period.toLowerCase() })}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {t("kpi.userKpiPanel.kpiIsCalculatedFromTheTasks")}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
              <p className="flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tabular-nums text-fg">
                  {summary.kpiScore}
                </span>
                <span className="text-sm text-fg-muted">{t("kpi.userKpiPanel.outOfPoints", { max: MAX_SCORE })}</span>
              </p>
              {summary.incentiveLabel && <Badge tone={tier.tone}>{summary.incentiveLabel}</Badge>}
            </div>
            <ScoreMeter score={summary.kpiScore} />
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-3">
            <Metric
              label={t("kpi.userKpiPanel.tasksAssigned")}
              value={String(summary.totalAssigned)}
              caption={t("kpi.userKpiPanel.thisMonth")}
            />
            <Metric
              label={t("common.done")}
              value={`${summary.completed}/${summary.totalAssigned}`}
              caption={t("kpi.userKpiPanel.completionrateOfAssignedTasks", { completionRate })}
              percent={completionRate}
            />
            <Metric
              label={t("kpi.userKpiPanel.onTime")}
              value={summary.completed === 0 ? "-" : `${onTimeRate}%`}
              caption={summary.completed === 0 ? t("kpi.userKpiPanel.noTaskFinishedYet") : t("kpi.userKpiPanel.ofTheTasksFinished")}
              percent={summary.completed === 0 ? undefined : onTimeRate}
            />
          </div>
        </>
      )}
    </section>
  );
}
