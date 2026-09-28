"use client";

import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { TasksPanel } from "@/features/tasks/components/TasksPanel";

export default function TasksPage() {
  const { data: currentUser } = useCurrentUser();
  if (!currentUser) return null;
  return <TasksPanel currentUser={currentUser} />;
}
