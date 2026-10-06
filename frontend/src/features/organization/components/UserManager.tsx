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

const LEVEL_LABELS: Record<AuthorityLevel, string> = {
  EXECUTIVE: "Điều hành (CEO/CTO/COO...)",
  DEPARTMENT_HEAD: "Trưởng phòng",
  TEAM_LEAD: "Trưởng nhóm",
  EMPLOYEE: "Nhân viên",
};

interface UserManagerProps {
  currentUser: UserProfile;
}

export function UserManager({ currentUser }: UserManagerProps) {
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
      showToast("success", "Đã thêm nhân sự");
      setCreating(false);
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không tạo được người dùng");
    }
  }

  function handleToggleActive(user: UserSummary) {
    setUserActive.mutate(
      { id: user.id, active: !user.active },
      {
        onSuccess: () => showToast("success", user.active ? "Đã khoá tài khoản" : "Đã mở khoá tài khoản"),
        onError: (err) =>
          showToast("error", err instanceof ApiRequestError ? err.message : "Không đổi được trạng thái"),
      },
    );
  }

  if (allowedLevels.length === 0) {
    return null; // EMPLOYEE has no user-management screen (mirrors the 403 the backend would return)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Nhân sự</h2>
        <PlusButton
          label="Thêm nhân sự"
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
            { header: "Tên đăng nhập", cell: (u) => u.username },
            {
              header: "Họ tên",
              cell: (u) => (
                <button
                  type="button"
                  onClick={() => setManagingUserId(u.id)}
                  title="Mở cửa sổ quản lý"
                  className="rounded text-left font-medium text-gray-900 hover:text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {u.fullName}
                </button>
              ),
            },
            { header: "Vai trò", cell: (u) => LEVEL_LABELS[u.authorityLevel] },
            { header: "Phòng ban", cell: (u) => (departments ?? []).find((d) => d.id === u.departmentId)?.name ?? "Chưa có" },
            { header: "Chức danh", cell: (u) => u.title ?? "-" },
            { header: "Mã NV", cell: (u) => u.employeeCode ?? "-" },
            { header: "SĐT", cell: (u) => u.phone ?? "-" },
            {
              header: "Trạng thái",
              cell: (u) => (
                <Badge tone={u.active ? "success" : "danger"}>
                  {u.active ? "Đang hoạt động" : "Đã khoá"}
                </Badge>
              ),
            },
            {
              header: "",
              cell: (u) => (
                <ActionMenu
                  label={`Tuỳ chọn cho ${u.fullName}`}
                  items={[
                    { label: "Quản lý", onSelect: () => setManagingUserId(u.id) },
                    { label: "Xoá", onSelect: () => setDeletingUser(u), danger: true },
                  ]}
                />
              ),
            },
          ]}
          rows={users ?? []}
          getRowKey={(u) => u.id}
          emptyState={
            <EmptyState
              title="Chưa có nhân sự nào trong phạm vi của bạn"
              description="Bấm + cạnh tiêu đề để thêm nhân sự đầu tiên."
            />
          }
        />
      )}

      {creating && (
      <Modal title="Thêm nhân sự" onClose={() => setCreating(false)} widthClassName="max-w-2xl">
      <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Tên đăng nhập"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          required
        />
        <Input
          label="Mật khẩu tạm thời"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={8}
          required
        />
        <Input
          label="Họ tên"
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
          label="Vai trò"
          value={form.authorityLevel}
          onChange={(e) => setForm({ ...form, authorityLevel: e.target.value as AuthorityLevel })}
          options={allowedLevels.map((level) => ({ value: level, label: LEVEL_LABELS[level] }))}
        />
        <Input
          label="Chức danh hiển thị (vd: CEO, CTO)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Input
          label="Số điện thoại (tuỳ chọn)"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label="Mã nhân viên (tuỳ chọn)"
          value={form.employeeCode}
          onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
        />
        <Input
          label="Ngày vào làm (tuỳ chọn)"
          type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
        />

        {isExecutive && form.authorityLevel !== "EXECUTIVE" && (
          <Select
            label="Phòng ban"
            value={form.departmentId ? String(form.departmentId) : ""}
            onChange={(e) => setForm({ ...form, departmentId: Number(e.target.value), teamId: undefined })}
            options={[
              { value: "", label: "-- Chọn phòng ban --" },
              ...(departments ?? []).map((d) => ({ value: String(d.id), label: d.name })),
            ]}
          />
        )}

        {isExecutive &&
          (form.authorityLevel === "TEAM_LEAD" || form.authorityLevel === "EMPLOYEE") &&
          form.departmentId && (
            <Select
              label="Nhóm (tuỳ chọn cho nhân viên, bắt buộc cho trưởng nhóm)"
              value={form.teamId ? String(form.teamId) : ""}
              onChange={(e) => setForm({ ...form, teamId: e.target.value ? Number(e.target.value) : undefined })}
              options={[
                { value: "", label: "-- Không thuộc nhóm nào --" },
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
            Thêm nhân sự
          </Button>
          <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
            Huỷ
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
            showToast("success", `Đã xoá ${deletingUser.fullName}`);
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
