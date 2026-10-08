"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { useTabs } from "@/components/layout/TabsContext";
import { AnimatedList } from "@/components/ui/AnimatedList";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { UserProfile } from "@/features/auth/types";
import { DepartmentAvatar } from "../departmentAppearance";
import { useDepartments } from "../hooks/useOrganization";
import { DepartmentCreateDialog } from "./DepartmentCreateDialog";

import { useI18n } from "@/lib/i18n/useI18n";
interface DepartmentManagerProps {
  currentUser: UserProfile;
}

/**
 * Medium square tiles (Phase 7 plan) instead of a table - clicking one opens its own detail page
 * (`/dashboard/departments/[id]`) rather than expanding inline. Creating a department opens a window
 * (`DepartmentCreateDialog`) and is still EXECUTIVE-only - the backend independently enforces this too
 * (`DepartmentController.create`'s `@PreAuthorize("hasAuthority('EXECUTIVE')")`, unchanged by this phase).
 */
export function DepartmentManager({ currentUser }: DepartmentManagerProps) {
  const { t } = useI18n();
  const { data: departments, isLoading } = useDepartments();
  const { navigateActiveTab } = useTabs();
  const [creating, setCreating] = useState(false);

  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";

  if (isLoading) {
    return <Skeleton rows={3} />;
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">{t("common.departments")}</h2>

      {(departments ?? []).length === 0 && !isExecutive ? (
        <EmptyState title={t("organization.departmentManager.noDepartmentsYet")} />
      ) : (
        <AnimatedList as="div" className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 [.pane-narrow_&]:sm:grid-cols-2 [.pane-narrow_&]:md:grid-cols-2">
          {(departments ?? []).map((department) => (
            <button
              key={department.id}
              type="button"
              onClick={() => navigateActiveTab(`/dashboard/departments/${department.id}`)}
              className="card-interactive flex aspect-square flex-col justify-between rounded glass-card p-4 text-left hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <DepartmentAvatar department={department} />
              <div>
                <p className="font-semibold text-fg">{department.name}</p>
                {department.description && (
                  <p className="line-clamp-2 text-xs text-fg-muted">{department.description}</p>
                )}
              </div>
            </button>
          ))}

          {isExecutive && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded border border-dashed border-line-strong text-fg-faint transition-all duration-150 hover:border-primary hover:text-primary-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Plus size={28} aria-hidden />
              <span className="text-xs">{t("common.createADepartment")}</span>
            </button>
          )}
        </AnimatedList>
      )}

      {isExecutive && creating && <DepartmentCreateDialog onClose={() => setCreating(false)} />}
    </section>
  );
}
