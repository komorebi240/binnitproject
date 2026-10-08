"use client";

import { BarChart } from "@/components/ui/BarChart";
import { ColumnChart } from "@/components/ui/ColumnChart";
import { Badge } from "@/components/ui/Badge";
import { CountUp } from "@/components/ui/CountUp";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMyKpiSummary } from "../hooks/useKpi";
import { useTasksList } from "@/features/tasks/hooks/useTasks";
import type { Task } from "@/features/tasks/types";
import type { UserProfile } from "@/features/auth/types";

import { useI18n } from "@/lib/i18n/useI18n";
import { weekdayShortKey } from "@/lib/weekdays";

function tierTone(kpiScore: number): "success" | "warning" | "danger" {
  if (kpiScore >= 70) return "success";
  if (kpiScore >= 40) return "warning";
  return "danger";
}

/** Completed-task count per day for the last 7 days (today last), by local calendar day of completedAt. */
function lastSevenDaysCompleted(tasks: Task[]): { weekday: number; value: number }[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i));
    const value = tasks.filter((t) => {
      if (t.status !== "DONE" || !t.completedAt) return false;
      const done = new Date(t.completedAt);
      return done.getFullYear() === day.getFullYear() && done.getMonth() === day.getMonth() && done.getDate() === day.getDate();
    }).length;
    return { weekday: day.getDay(), value };
  });
}

interface KpiSummaryCardsProps {
  currentUser: UserProfile;
}

/**
 * The three "quick glance" numbers plus the workload chart, both from Phase 5's KPI module -
 * see features/kpi/types.ts and backend KpiServiceImpl for how the score is computed.
 */
export function KpiSummaryCards({ currentUser }: KpiSummaryCardsProps) {
  const { t } = useI18n();
  const { data: summary, isLoading } = useMyKpiSummary();
  const { data: tasks } = useTasksList();

  if (isLoading) {
    return <Skeleton rows={2} />;
  }
  if (!summary) return null;

  const period = t("kpi.kpiSummaryCards.monthMonthYear", { month: summary.periodMonth, year: summary.periodYear });
  // Scoped to the same period as the KPI cards above (createdAt in the current calendar month)
  // so the chart and the numbers next to it are never talking about a different window of time.
  const monthStart = new Date(summary.periodYear, summary.periodMonth - 1, 1);
  const allMyTasks = (tasks ?? []).filter((t) => t.assigneeUserId === currentUser.userId);
  const myTasks = allMyTasks.filter((t) => new Date(t.createdAt) >= monthStart);
  const segments = [
    { label: t("kpi.kpiSummaryCards.assigned"), value: myTasks.filter((t) => t.status === "ASSIGNED").length, colorClassName: "bg-fg-faint" },
    { label: t("common.accepted"), value: myTasks.filter((t) => t.status === "ACCEPTED").length, colorClassName: "bg-primary" },
    { label: t("common.done"), value: myTasks.filter((t) => t.status === "DONE").length, colorClassName: "bg-success" },
    {
      label: t("kpi.kpiSummaryCards.declinedCancelled"),
      value: myTasks.filter((t) => t.status === "DECLINED" || t.status === "CANCELLED").length,
      colorClassName: "bg-danger",
    },
  ];

  const weekBars = lastSevenDaysCompleted(allMyTasks).map(({ weekday, value }) => ({ label: t(weekdayShortKey(weekday)), value }));

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 [.pane-narrow_&]:sm:grid-cols-1">
        <div className="rounded-lg glass-card p-4">
          <p className="text-sm text-fg-muted">{t("kpi.kpiSummaryCards.workloadForPeriod", { period })}</p>
          <p className="mt-1 text-2xl font-semibold text-fg">
            <CountUp value={summary.totalAssigned} />
          </p>
        </div>
        <div className="rounded-lg glass-card p-4">
          <p className="text-sm text-fg-muted">{t("common.completionRate")}</p>
          <p className="mt-1 text-2xl font-semibold text-fg">
            <CountUp value={summary.completionRatePercent} suffix="%" />
          </p>
        </div>
        <div className="rounded-lg glass-card p-4">
          <p className="text-sm text-fg-muted">{t("common.thisMonthSKpi")}</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-2xl font-semibold text-fg">
              <CountUp value={summary.kpiScore} />
            </p>
            {summary.incentiveLabel && <Badge tone={tierTone(summary.kpiScore)}>{summary.incentiveLabel}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 [.pane-narrow_&]:lg:grid-cols-1">
        <div className="rounded-lg glass-card p-4">
          <p className="mb-3 text-sm font-medium text-fg-soft">
            {t("kpi.kpiSummaryCards.workloadByStatusForPeriod", { period })}
          </p>
          <BarChart segments={segments} />
        </div>
        <div className="rounded-lg glass-card p-4">
          <p className="mb-3 text-sm font-medium text-fg-soft">{t("kpi.kpiSummaryCards.tasksCompletedInTheLast7")}</p>
          <ColumnChart bars={weekBars} ariaLabel={t("kpi.kpiSummaryCards.numberOfTasksCompletedEachDay")} />
        </div>
      </div>
    </section>
  );
}
