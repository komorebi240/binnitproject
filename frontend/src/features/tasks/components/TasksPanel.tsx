"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { PlusButton } from "@/components/ui/PlusButton";
import type { UserProfile } from "@/features/auth/types";
import { CreateOwnTaskForm } from "./CreateOwnTaskForm";
import { CreateTaskForm } from "./CreateTaskForm";
import { TaskList } from "./TaskList";

interface TasksPanelProps {
  currentUser: UserProfile;
}

export function TasksPanel({ currentUser }: TasksPanelProps) {
  const canAssign = currentUser.authorityLevel !== "EMPLOYEE";
  const [creating, setCreating] = useState(false);
  const closeModal = () => setCreating(false);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Công việc</h2>
        <PlusButton label={canAssign ? "Giao việc mới" : "Thêm việc cho mình"} onClick={() => setCreating(true)} />
      </div>
      <TaskList currentUser={currentUser} />
      {creating && (
        <Modal title={canAssign ? "Giao việc mới" : "Thêm việc cho mình"} onClose={closeModal}>
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
