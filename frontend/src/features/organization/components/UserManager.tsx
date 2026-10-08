"use client";

import { useState } from "react";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PlusButton } from "@/components/ui/PlusButton";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { AuthorityLevel, UserProfile } from "@/features/auth/types";
import { allowedLevelsFor } from "../grantLevels";
import { useDepartments, useTeams } from "../hooks/useOrganization";
import { useCreateUser, useSetUserActive, useUsers } from "../hooks/useOrganization";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { StaffSettingsDialog } from "./StaffSettingsDialog";
import { InviteStaffButton } from "@/features/onboarding/components/InviteStaffButton";
import type { CreateUserInput, UserSummary } from "../types";

import { LEVEL_LABEL_KEYS } from "@/features/onboarding/types";
import { useI18n } from "@/lib/i18n/useI18n";
interface UserManagerProps {
  currentUser: UserProfile;
}

export function UserManager({ currentUser }: UserManagerProps) {
  const { t } = useI18n();
  const { data: users, isLoading } = useUsers();
  const { data: departments } = useDepartments();
  const createUser = useCreateUser();
  const setUserActive = useSetUserActive();
  const { showToast } = useToast();

  const allowedLevels = allowedLevelsFor(currentUser.authorityLevel);
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    authorityLevel: allowedLevels[0] ?? "EMPLOYEE",
    title: "",
    departmentId: currentUser.departmentId ?? undefined,
    teamId: currentUser.teamId ?? undefined,
    phone: "",
    employeeCode: "",
    startDate: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [managingUserId, setManagingUserId] = useState<number | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserSummary | null>(null);
  const [creating, setCreating] = useState(false);

  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";
  const managingUser = managingUserId == null ? undefined : (users ?? []).find((u) => u.id === managingUserId);
  const { data: teamsInChosenDepartment } = useTeams(form.departmentId ?? -1);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const input: CreateUserInput = {
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        email: form.email || undefined,
        authorityLevel: form.authorityLevel,
        title: form.title || undefined,
        departmentId: form.departmentId,
        teamId: form.teamId,
        phone: form.phone || undefined,
        employeeCode: form.employeeCode || undefined,
        startDate: form.startDate || undefined,
      };
      await createUser.mutateAsync(input);
      setForm((prev) => ({
        ...prev,
        username: "",
        password: "",
        fullName: "",
        email: "",
        title: "",
        phone: "",
        employeeCode: "",
        startDate: "",
      }));
      showToast("success", t("organization.userManager.staffAdded"));
      setCreating(false);
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("organization.userManager.couldnTCreateTheUser"));
    }
  }

  function handleToggleActive(user: UserSummary) {
    setUserActive.mutate(
      { id: user.id, active: !user.active },
      {
        onSuccess: () => showToast("success", user.active ? t("organization.userManager.accountLocked") : t("organization.userManager.accountUnlocked")),
        onError: (err) =>
          showToast("error", err instanceof ApiRequestError ? err.message : t("common.couldnTChangeYourStatus")),
      },
    );
  }

  if (allowedLevels.length === 0) {
    return null; // EMPLOYEE has no user-management screen (mirrors the 403 the backend would return)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-fg">{t("common.staff")}</h2>
        <PlusButton
          label={t("common.addStaff")}
          onClick={() => {
            setErrorMessage(null);
            setCreating(true);
          }}
        />
        <InviteStaffButton currentUser={currentUser} />
      </div>

      {isLoading ? (
        <Skeleton rows={4} />
      ) : (
        <Table<UserSummary>
          columns={[
            { header: t("common.username"), cell: (u) => u.username },
            {
              header: t("common.fullName"),
              cell: (u) => (
                <button
                  type="button"
                  onClick={() => setManagingUserId(u.id)}
                  title={t("organization.userManager.openManagementWindow")}
                  className="rounded text-left font-medium text-fg hover:text-primary-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {u.fullName}
                </button>
              ),
            },
            { header: t("common.role"), cell: (u) => t(LEVEL_LABEL_KEYS[u.authorityLevel]) },
            { header: t("common.departments"), cell: (u) => (departments ?? []).find((d) => d.id === u.departmentId)?.name ?? t("organization.userManager.noneYet") },
            { header: t("organization.userManager.jobTitle"), cell: (u) => u.title ?? "-" },
            { header: t("organization.userManager.employeeId"), cell: (u) => u.employeeCode ?? "-" },
            { header: t("organization.userManager.phone"), cell: (u) => u.phone ?? "-" },
            {
              header: t("common.status"),
              cell: (u) => (
                <Badge tone={u.active ? "success" : "danger"}>
                  {u.active ? t("organization.staffSettingsDialog.active") : t("organization.staffSettingsDialog.locked")}
                </Badge>
              ),
            },
            {
              header: "",
              cell: (u) => (
                <ActionMenu
                  label={t("organization.userManager.optionsForFullname", { fullName: u.fullName })}
                  items={[
                    { label: t("organization.userManager.manage"), onSelect: () => setManagingUserId(u.id) },
                    { label: t("common.delete"), onSelect: () => setDeletingUser(u), danger: true },
                  ]}
                />
              ),
            },
          ]}
          rows={users ?? []}
          getRowKey={(u) => u.id}
          emptyState={
            <EmptyState
              title={t("organization.userManager.noStaffInYourScopeYet")}
              description={t("organization.userManager.clickNextToTheTitleTo")}
            />
          }
        />
      )}

      {creating && (
      <Modal title={t("common.addStaff")} onClose={() => setCreating(false)} widthClassName="max-w-2xl">
      <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label={t("common.username")}
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          required
        />
        <Input
          label={t("organization.userManager.temporaryPassword")}
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={8}
          required
        />
        <Input
          label={t("common.fullName")}
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Select
          label={t("common.role")}
          value={form.authorityLevel}
          onChange={(e) => setForm({ ...form, authorityLevel: e.target.value as AuthorityLevel })}
          options={allowedLevels.map((level) => ({ value: level, label: t(LEVEL_LABEL_KEYS[level]) }))}
        />
        <Input
          label={t("organization.userManager.displayedJobTitleEGCeo")}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Input
          label={t("common.phoneNumberOptional")}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label={t("organization.userManager.employeeIdOptional")}
          value={form.employeeCode}
          onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
        />
        <Input
          label={t("organization.userManager.startDateOptional")}
          type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
        />

        {isExecutive && form.authorityLevel !== "EXECUTIVE" && (
          <Select
            label={t("common.departments")}
            value={form.departmentId ? String(form.departmentId) : ""}
            onChange={(e) => setForm({ ...form, departmentId: Number(e.target.value), teamId: undefined })}
            options={[
              { value: "", label: t("common.chooseADepartment") },
              ...(departments ?? []).map((d) => ({ value: String(d.id), label: d.name })),
            ]}
          />
        )}

        {isExecutive &&
          (form.authorityLevel === "TEAM_LEAD" || form.authorityLevel === "EMPLOYEE") &&
          form.departmentId && (
            <Select
              label={t("organization.transferPositionForm.teamOptionalForEmployeesRequiredFor")}
              value={form.teamId ? String(form.teamId) : ""}
              onChange={(e) => setForm({ ...form, teamId: e.target.value ? Number(e.target.value) : undefined })}
              options={[
                { value: "", label: t("common.noTeam") },
                ...(teamsInChosenDepartment ?? []).map((t) => ({ value: String(t.id), label: t.name })),
              ]}
            />
          )}

        {errorMessage && (
          <p role="alert" className="text-sm text-danger sm:col-span-2">
            {errorMessage}
          </p>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" loading={createUser.isPending}>
            {t("common.addStaff")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
      </Modal>
      )}
      {deletingUser && (
        <DeleteUserDialog
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onDeleted={() => {
            showToast("success", t("organization.userManager.deletedFullname", { fullName: deletingUser.fullName }));
            setDeletingUser(null);
          }}
        />
      )}
      {managingUser && (
        <StaffSettingsDialog
          user={managingUser}
          allowedLevels={allowedLevels}
          onToggleActive={() => handleToggleActive(managingUser)}
          toggleActivePending={setUserActive.isPending}
          onClose={() => setManagingUserId(null)}
        />
      )}
    </section>
  );
}
