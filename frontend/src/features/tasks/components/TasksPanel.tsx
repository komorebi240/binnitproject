"use client";

import type { UserProfile } from "@/features/auth/types";
import { CreateTaskForm } from "./CreateTaskForm";
import { TaskList } from "./TaskList";

interface TasksPanelProps {
  currentUser: UserProfile;
}

export function TasksPanel({ currentUser }: TasksPanelProps) {
  const canAssign = currentUser.authorityLevel !== "EMPLOYEE";

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Công việc</h2>
      <TaskList currentUser={currentUser} />
      {canAssign && <CreateTaskForm currentUser={currentUser} />}
    </section>
  );
}
