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

const MONTH_LABEL = (year: number, month: number) => `Tháng ${month}/${year}`;

function tierTone(kpiScore: number): "success" | "warning" | "danger" {
  if (kpiScore >= 70) return "success";
  if (kpiScore >= 40) return "warning";
  return "danger";
}

const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Completed-task count per day for the last 7 days (today last), by local calendar day of completedAt. */
function lastSevenDaysCompleted(tasks: Task[]): { label: string; value: number }[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i));
    const value = tasks.filter((t) => {
      if (t.status !== "DONE" || !t.completedAt) return false;
      const done = new Date(t.completedAt);
      return done.getFullYear() === day.getFullYear() && done.getMonth() === day.getMonth() && done.getDate() === day.getDate();
    }).length;
    return { label: WEEKDAY_SHORT[day.getDay()] ?? "", value };
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
  const { data: summary, isLoading } = useMyKpiSummary();
  const { data: tasks } = useTasksList();

  if (isLoading) {
    return <Skeleton rows={2} />;
  }
  if (!summary) return null;

  // Scoped to the same period as the KPI cards above (createdAt in the current calendar month)
  // so the chart and the numbers next to it are never talking about a different window of time.
  const monthStart = new Date(summary.periodYear, summary.periodMonth - 1, 1);
  const allMyTasks = (tasks ?? []).filter((t) => t.assigneeUserId === currentUser.userId);
  const myTasks = allMyTasks.filter((t) => new Date(t.createdAt) >= monthStart);
  const segments = [
    { label: "Đã giao", value: myTasks.filter((t) => t.status === "ASSIGNED").length, colorClassName: "bg-fg-faint" },
    { label: "Đã nhận", value: myTasks.filter((t) => t.status === "ACCEPTED").length, colorClassName: "bg-primary" },
    { label: "Hoàn thành", value: myTasks.filter((t) => t.status === "DONE").length, colorClassName: "bg-success" },
    {
      label: "Từ chối/Huỷ",
      value: myTasks.filter((t) => t.status === "DECLINED" || t.status === "CANCELLED").length,
      colorClassName: "bg-danger",
    },
  ];

  const weekBars = lastSevenDaysCompleted(allMyTasks);

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 [.pane-narrow_&]:sm:grid-cols-1">
        <div className="rounded-lg glass-card p-4">
          <p className="text-sm text-fg-muted">Khối lượng công việc ({MONTH_LABEL(summary.periodYear, summary.periodMonth)})</p>
          <p className="mt-1 text-2xl font-semibold text-fg">
            <CountUp value={summary.totalAssigned} />
          </p>
        </div>
        <div className="rounded-lg glass-card p-4">
          <p className="text-sm text-fg-muted">Tỷ lệ hoàn thành</p>
          <p className="mt-1 text-2xl font-semibold text-fg">
            <CountUp value={summary.completionRatePercent} suffix="%" />
          </p>
        </div>
        <div className="rounded-lg glass-card p-4">
          <p className="text-sm text-fg-muted">KPI tháng này</p>
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
            Khối lượng công việc theo trạng thái ({MONTH_LABEL(summary.periodYear, summary.periodMonth)})
          </p>
          <BarChart segments={segments} />
        </div>
        <div className="rounded-lg glass-card p-4">
          <p className="mb-3 text-sm font-medium text-fg-soft">Việc hoàn thành 7 ngày gần đây</p>
          <ColumnChart bars={weekBars} ariaLabel="Số việc hoàn thành mỗi ngày trong 7 ngày gần đây" />
        </div>
      </div>
    </section>
  );
}
