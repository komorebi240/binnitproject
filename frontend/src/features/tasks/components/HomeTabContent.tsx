"use client";

import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { KpiSummaryCards } from "@/features/kpi/components/KpiSummaryCards";
import { HomeTaskColumns } from "./HomeTaskColumns";
import { TaskBoardView } from "./TaskBoardView";

import { useI18n } from "@/lib/i18n/useI18n";
interface HomeTabContentProps {
  boardView: boolean;
}

/** The "/dashboard" virtual page's content - extracted from the old app/dashboard/page.tsx so
 * TabContentRenderer can render it directly per-tab. `boardView` now lives on the Tab itself
 * (TabsContext), not a shared HomeViewContext, so two Home tabs can independently show the
 * KPI view and the ☰ board view at the same time. */
export function HomeTabContent({ boardView }: HomeTabContentProps) {
  const { t } = useI18n();
  const { data: currentUser } = useCurrentUser();
  if (!currentUser) return null;

  return (
    <>
      <h1 className="mb-4 text-lg font-semibold text-fg">
        {boardView ? t("tasks.homeTabContent.myTasks") : t("tasks.homeTabContent.home")}
      </h1>
      {boardView ? (
        <TaskBoardView currentUser={currentUser} />
      ) : (
        <div className="flex flex-col gap-6">
          <KpiSummaryCards currentUser={currentUser} />
          <HomeTaskColumns currentUser={currentUser} />
        </div>
      )}
    </>
  );
}
