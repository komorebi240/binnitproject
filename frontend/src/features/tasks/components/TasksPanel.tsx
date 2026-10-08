"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { PlusButton } from "@/components/ui/PlusButton";
import type { UserProfile } from "@/features/auth/types";
import { CreateOwnTaskForm } from "./CreateOwnTaskForm";
import { CreateTaskForm } from "./CreateTaskForm";
import { TaskList } from "./TaskList";

import { useI18n } from "@/lib/i18n/useI18n";
interface TasksPanelProps {
  currentUser: UserProfile;
}

export function TasksPanel({ currentUser }: TasksPanelProps) {
  const { t } = useI18n();
  const canAssign = currentUser.authorityLevel !== "EMPLOYEE";
  const [creating, setCreating] = useState(false);
  const closeModal = () => setCreating(false);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-fg">{t("common.tasks")}</h2>
        <PlusButton label={canAssign ? t("common.assignANewTask") : t("tasks.taskBoardView.addATaskForYourself")} onClick={() => setCreating(true)} />
      </div>
      <TaskList currentUser={currentUser} />
      {creating && (
        <Modal title={canAssign ? t("common.assignANewTask") : t("tasks.taskBoardView.addATaskForYourself")} onClose={closeModal}>
          {canAssign ? (
            <CreateTaskForm currentUser={currentUser} onDone={closeModal} />
          ) : (
            <CreateOwnTaskForm currentUser={currentUser} onDone={closeModal} />
          )}
        </Modal>
      )}
    </section>
  );
}
