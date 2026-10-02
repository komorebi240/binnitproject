"use client";

import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api/client";
import { useUserKpiSummary } from "../hooks/useKpi";

function tierTone(kpiScore: number): "success" | "warning" | "danger" {
  if (kpiScore >= 70) return "success";
  if (kpiScore >= 40) return "warning";
  return "danger";
}

interface UserKpiPanelProps {
  userId: number;
}

/** Inline panel shown under a Nhân sự row when a manager clicks "Xem KPI" - see UserManager.tsx. */
export function UserKpiPanel({ userId }: UserKpiPanelProps) {
  const { data: summary, isLoading, isError, error } = useUserKpiSummary(userId, true);

  if (isLoading) {
    return <Skeleton rows={1} />;
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error instanceof ApiRequestError ? error.message : "Không xem được KPI"}
      </p>
    );
  }
  if (!summary) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded border border-gray-200 bg-surface-muted p-3 text-sm">
      <span>
        Khối lượng: <strong>{summary.totalAssigned}</strong>
      </span>
      <span>
        Hoàn thành: <strong>{summary.completionRatePercent}%</strong>
      </span>
      <span>
        KPI: <strong>{summary.kpiScore}</strong>
      </span>
      {summary.incentiveLabel && <Badge tone={tierTone(summary.kpiScore)}>{summary.incentiveLabel}</Badge>}
    </div>
  );
}
