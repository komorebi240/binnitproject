"use client";

import { BarChart } from "@/components/ui/BarChart";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMyKpiSummary } from "../hooks/useKpi";
import { useTasksList } from "@/features/tasks/hooks/useTasks";
import type { UserProfile } from "@/features/auth/types";

const MONTH_LABEL = (year: number, month: number) => `Tháng ${month}/${year}`;

function tierTone(kpiScore: number): "success" | "warning" | "danger" {
  if (kpiScore >= 70) return "success";
  if (kpiScore >= 40) return "warning";
  return "danger";
}

interface KpiSummaryCardsProps {
  currentUser: UserProfile;
}

/**
 * The three "quick glance" numbers plus the workload chart, both from Phase 5's KPI module —
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
  const myTasks = (tasks ?? []).filter(
    (t) => t.assigneeUserId === currentUser.userId && new Date(t.createdAt) >= monthStart,
  );
  const segments = [
    { label: "Đã giao", value: myTasks.filter((t) => t.status === "ASSIGNED").length, colorClassName: "bg-gray-400" },
    { label: "Đã nhận", value: myTasks.filter((t) => t.status === "ACCEPTED").length, colorClassName: "bg-primary" },
    { label: "Hoàn thành", value: myTasks.filter((t) => t.status === "DONE").length, colorClassName: "bg-green-500" },
    {
      label: "Từ chối/Huỷ",
      value: myTasks.filter((t) => t.status === "DECLINED" || t.status === "CANCELLED").length,
      colorClassName: "bg-danger",
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Khối lượng công việc ({MONTH_LABEL(summary.periodYear, summary.periodMonth)})</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.totalAssigned}</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Tỷ lệ hoàn thành</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.completionRatePercent}%</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">KPI tháng này</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-2xl font-semibold text-gray-900">{summary.kpiScore}</p>
            {summary.incentiveLabel && <Badge tone={tierTone(summary.kpiScore)}>{summary.incentiveLabel}</Badge>}
          </div>
        </div>
      </div>

      <div className="rounded border border-gray-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-gray-700">
          Khối lượng công việc theo trạng thái ({MONTH_LABEL(summary.periodYear, summary.periodMonth)})
        </p>
        <BarChart segments={segments} />
      </div>
    </section>
  );
}
