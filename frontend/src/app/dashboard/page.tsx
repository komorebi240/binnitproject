"use client";

import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { useHomeView } from "@/components/layout/HomeViewContext";
import { KpiSummaryCards } from "@/features/kpi/components/KpiSummaryCards";
import { TaskBoardView } from "@/features/tasks/components/TaskBoardView";

/** Employee home — KPI/workload overview, or the ☰ board view (header icon) over the same tasks. */
export default function DashboardHomePage() {
  const { data: currentUser } = useCurrentUser();
  const { isBoardView } = useHomeView();
  if (!currentUser) return null;

  return (
    <>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">
        {isBoardView ? "Công việc của tôi" : "Trang chủ"}
      </h1>
      {isBoardView ? <TaskBoardView currentUser={currentUser} /> : <KpiSummaryCards currentUser={currentUser} />}
    </>
  );
}
