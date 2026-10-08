"use client";

import { useState } from "react";
import { AddEventForUserForm } from "@/features/calendar/components/AddEventForUserForm";
import { UserKpiPanel } from "@/features/kpi/components/UserKpiPanel";
import type { AuthorityLevel } from "@/features/auth/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs, useTabsIds } from "@/components/ui/Tabs";
import { ChangeEmailPanel, ResetPasswordPanel } from "./StaffAccountPanels";
import { TransferPositionForm } from "./TransferPositionForm";
import type { UserSummary } from "../types";

import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useI18n } from "@/lib/i18n/useI18n";
type Section = "position" | "kpi" | "calendar" | "account";

const SECTIONS: { id: Section; labelKey: TranslationKey }[] = [
  { id: "position", labelKey: "organization.staffSettingsDialog.departmentPosition" },
  { id: "kpi", labelKey: "organization.staffSettingsDialog.kpi" },
  { id: "calendar", labelKey: "organization.staffSettingsDialog.calendar" },
  { id: "account", labelKey: "common.account" },
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
  const { t } = useI18n();
  const [section, setSection] = useState<Section>("position");
  const tabIds = useTabsIds();

  return (
    <Modal title={t("organization.staffSettingsDialog.manageStaffFullname", { fullName: user.fullName })} onClose={onClose} widthClassName="max-w-3xl">
      <div className="flex min-h-[22rem] flex-col gap-4 md:flex-row">
        <Tabs
          label={t("organization.staffSettingsDialog.managementSections")}
          variant="side"
          ids={tabIds}
          value={section}
          onChange={setSection}
          items={SECTIONS.map(({ id, labelKey }) => ({ id, label: t(labelKey) }))}
        />

        <div role="tabpanel" id={tabIds.panelId(section)} aria-labelledby={tabIds.tabId(section)} className="min-w-0 flex-1">
          {section === "position" && (
            <TransferPositionForm user={user} allowedLevels={allowedLevels} onDone={onClose} />
          )}
          {section === "kpi" && <UserKpiPanel userId={user.id} />}
          {section === "calendar" && <AddEventForUserForm userId={user.id} onDone={onClose} />}
          {section === "account" && (
            <div className="flex flex-col gap-6">
              <section className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-fg">{t("organization.staffSettingsDialog.accountStatus")}</h4>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={user.active ? "success" : "danger"}>
                    {user.active ? t("organization.staffSettingsDialog.active") : t("organization.staffSettingsDialog.locked")}
                  </Badge>
                  <Button
                    variant="secondary"
                    onClick={onToggleActive}
                    loading={toggleActivePending}
                  >
                    {user.active ? t("organization.staffSettingsDialog.lockAccount") : t("organization.staffSettingsDialog.unlockAccount")}
                  </Button>
                </div>
              </section>
              <section className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-fg">{t("common.password")}</h4>
                <ResetPasswordPanel user={user} />
              </section>
              <section className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-fg">Email</h4>
                <ChangeEmailPanel user={user} />
              </section>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
