"use client";

import { useState } from "react";
import { AddEventForUserForm } from "@/features/calendar/components/AddEventForUserForm";
import { UserKpiPanel } from "@/features/kpi/components/UserKpiPanel";
import type { AuthorityLevel } from "@/features/auth/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ChangeEmailPanel, ResetPasswordPanel } from "./StaffAccountPanels";
import { TransferPositionForm } from "./TransferPositionForm";
import type { UserSummary } from "../types";

type Section = "position" | "kpi" | "calendar" | "account";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "position", label: "Phòng ban & chức vụ" },
  { id: "kpi", label: "KPI" },
  { id: "calendar", label: "Lịch" },
  { id: "account", label: "Tài khoản" },
];

interface StaffSettingsDialogProps {
  user: UserSummary;
  allowedLevels: AuthorityLevel[];
  onToggleActive: () => void;
  toggleActivePending: boolean;
  onClose: () => void;
}

/**
 * Everything a manager can do to one staff member in a single window, laid out like the Settings page:
 * a list of sections on the left (a row of tabs on a phone) and the chosen section on the right.
 * Deleting stays a separate, deliberate action in the row menu.
 */
export function StaffSettingsDialog({
  user,
  allowedLevels,
  onToggleActive,
  toggleActivePending,
  onClose,
}: StaffSettingsDialogProps) {
  const [section, setSection] = useState<Section>("position");

  return (
    <Modal title={`Quản lý nhân sự: ${user.fullName}`} onClose={onClose} widthClassName="max-w-3xl">
      <div className="flex min-h-[22rem] flex-col gap-4 md:flex-row">
        <nav
          aria-label="Mục quản lý"
          className="flex shrink-0 gap-1 overflow-x-auto md:w-44 md:flex-col md:overflow-visible"
          role="tablist"
          aria-orientation="vertical"
        >
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={section === id}
              onClick={() => setSection(id)}
              className={`whitespace-nowrap rounded px-3 py-2 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                section === id
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-surface-muted hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div role="tabpanel" className="min-w-0 flex-1">
          {section === "position" && (
            <TransferPositionForm user={user} allowedLevels={allowedLevels} onDone={onClose} />
          )}
          {section === "kpi" && <UserKpiPanel userId={user.id} />}
          {section === "calendar" && <AddEventForUserForm userId={user.id} onDone={onClose} />}
          {section === "account" && (
            <div className="flex flex-col gap-6">
              <section className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-gray-900">Trạng thái tài khoản</h4>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={user.active ? "success" : "danger"}>
                    {user.active ? "Đang hoạt động" : "Đã khoá"}
                  </Badge>
                  <Button
                    variant="secondary"
                    onClick={onToggleActive}
                    loading={toggleActivePending}
                  >
                    {user.active ? "Khoá tài khoản" : "Mở khoá tài khoản"}
                  </Button>
                </div>
              </section>
              <section className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-gray-900">Mật khẩu</h4>
                <ResetPasswordPanel user={user} />
              </section>
              <section className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-gray-900">Email</h4>
                <ChangeEmailPanel user={user} />
              </section>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
