"use client";

import { useState } from "react";
import { Handshake } from "@phosphor-icons/react";
import { useTabs } from "@/components/layout/TabsContext";
import { Badge } from "@/components/ui/Badge";
import { AnimatedList } from "@/components/ui/AnimatedList";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlusButton } from "@/components/ui/PlusButton";
import { Skeleton } from "@/components/ui/Skeleton";
import type { UserProfile } from "@/features/auth/types";
import { useProjects } from "../hooks/useProjects";
import { CreateProjectDialog } from "./CreateProjectDialog";

/** Executives and department heads start projects; everyone else only sees the ones they take part in. */
export function ProjectsPanel({ currentUser }: { currentUser: UserProfile }) {
  const { data: projects, isLoading } = useProjects();
  const { navigateActiveTab } = useTabs();
  const [creating, setCreating] = useState(false);
  const canCreate = currentUser.authorityLevel === "EXECUTIVE" || currentUser.authorityLevel === "DEPARTMENT_HEAD";

  if (isLoading) {
    return <Skeleton rows={3} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-fg">Dự án</h2>
        {canCreate && <PlusButton label="Tạo dự án mới" onClick={() => setCreating(true)} />}
      </div>

      {(projects ?? []).length === 0 ? (
        <EmptyState
          title="Chưa có dự án nào"
          description={
            canCreate
              ? "Tạo dự án và mời các phòng ban khác cùng thực hiện."
              : "Khi bạn được thêm vào một dự án chung nhiều phòng ban, nó sẽ hiện ở đây."
          }
        />
      ) : (
        <AnimatedList className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
          {(projects ?? []).map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => navigateActiveTab(`/dashboard/projects/${project.id}`)}
                className="flex h-full w-full flex-col gap-2 rounded-lg glass-card p-4 text-left transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="flex items-start gap-2">
                  <Handshake size={20} aria-hidden className="mt-0.5 shrink-0 text-primary-text" />
                  <span className="line-clamp-2 font-semibold text-fg">{project.name}</span>
                </span>
                {project.description && <span className="line-clamp-3 text-sm text-fg-soft">{project.description}</span>}
                <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-xs text-fg-muted">
                  <span>Chủ trì: {project.ownerDepartmentName ?? "-"}</span>
                  <span aria-hidden>·</span>
                  <span>{project.supportDepartmentCount} phòng hỗ trợ</span>
                  <span aria-hidden>·</span>
                  <span>{project.memberCount} thành viên</span>
                </span>
                {project.invitationWaiting && <Badge tone="warning">Có lời mời chờ phản hồi</Badge>}
              </button>
            </li>
          ))}
        </AnimatedList>
      )}

      {creating && <CreateProjectDialog currentUser={currentUser} onClose={() => setCreating(false)} />}
    </div>
  );
}
