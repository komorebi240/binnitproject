"use client";

import { useState } from "react";
import { DotsThreeVertical } from "@phosphor-icons/react";
import { useTabs } from "@/components/layout/TabsContext";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DepartmentMember } from "../types";

const LEVEL_LABELS: Record<string, string> = {
  EXECUTIVE: "Điều hành",
  DEPARTMENT_HEAD: "Trưởng phòng",
  TEAM_LEAD: "Trưởng nhóm",
  EMPLOYEE: "Nhân viên",
};

interface MemberListProps {
  members: DepartmentMember[] | undefined;
  isLoading: boolean;
  /** Shown in each member's info popover, e.g. the department or team name. */
  contextLabel: string;
  emptyTitle: string;
}

/**
 * Presentational member list shared by DepartmentMemberList and TeamMemberList - same "..."
 * info popover (public info plus entry points into messaging/Drive, never management actions;
 * see DepartmentMemberList's original comment) regardless of whether the members came from a
 * department or a team.
 */
export function MemberList({ members, isLoading, contextLabel, emptyTitle }: MemberListProps) {
  const [openMemberId, setOpenMemberId] = useState<number | null>(null);
  const { navigateActiveTab } = useTabs();

  if (isLoading) {
    return <Skeleton rows={4} />;
  }

  if ((members ?? []).length === 0) {
    return <EmptyState title={emptyTitle} />;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {(members ?? []).map((member) => (
        <li key={member.userId} className="relative flex items-center justify-between rounded border border-line px-3 py-2">
          <div className="flex items-center gap-2.5">
            <Avatar avatarUrl={member.avatarUrl} fullName={member.fullName} presenceStatus={member.presenceStatus} size="sm" />
            <div>
              <p className="text-sm font-medium text-fg">{member.fullName}</p>
              <p className="text-xs text-fg-muted">{member.title ?? LEVEL_LABELS[member.authorityLevel]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpenMemberId(openMemberId === member.userId ? null : member.userId)}
            aria-label="Xem thông tin"
            className="flex h-8 w-8 items-center justify-center rounded text-fg-faint transition-colors duration-150 hover:bg-surface-muted hover:text-fg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <DotsThreeVertical size={18} weight="bold" aria-hidden />
          </button>

          {openMemberId === member.userId && (
            <>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setOpenMemberId(null)}
                className="fixed inset-0 z-20 cursor-default"
              />
              <div className="animate-fade-in absolute right-0 top-10 z-30 w-64 rounded glass p-3 text-sm">
                <p className="font-medium text-fg">{member.fullName}</p>
                <p className="text-fg-muted">{member.email ?? "Chưa có email"}</p>
                <p className="text-fg-muted">
                  {contextLabel} · {LEVEL_LABELS[member.authorityLevel]}
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      navigateActiveTab(`/dashboard/messages?with=${member.userId}&name=${encodeURIComponent(member.fullName)}`)
                    }
                    className="rounded bg-surface-muted px-2 py-1.5 text-center text-xs font-medium text-fg-soft hover:bg-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    Nhắn tin riêng
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateActiveTab("/dashboard/drive")}
                    className="rounded bg-surface-muted px-2 py-1.5 text-center text-xs font-medium text-fg-soft hover:bg-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    Gửi yêu cầu Drive
                  </button>
                </div>
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
