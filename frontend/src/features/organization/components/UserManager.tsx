"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { AuthorityLevel, UserProfile } from "@/features/auth/types";
import { useDepartments, useTeams } from "../hooks/useOrganization";
import { useCreateUser, useDeleteUser, useUsers } from "../hooks/useOrganization";
import type { CreateUserInput, UserSummary } from "../types";

const LEVEL_LABELS: Record<AuthorityLevel, string> = {
  EXECUTIVE: "Điều hành (CEO/CTO/COO...)",
  DEPARTMENT_HEAD: "Trưởng phòng",
  TEAM_LEAD: "Trưởng nhóm",
  EMPLOYEE: "Nhân viên",
};

/** Mirrors UserManagementServiceImpl.assertCallerCanGrant on the backend — for UX only, the
 * backend re-checks independently (CLAUDE.md section 9). */
function allowedLevelsFor(callerLevel: AuthorityLevel): AuthorityLevel[] {
  switch (callerLevel) {
    case "EXECUTIVE":
      return ["EXECUTIVE", "DEPARTMENT_HEAD", "TEAM_LEAD", "EMPLOYEE"];
    case "DEPARTMENT_HEAD":
      return ["TEAM_LEAD", "EMPLOYEE"];
    case "TEAM_LEAD":
      return ["EMPLOYEE"];
    default:
      return [];
  }
}

interface UserManagerProps {
  currentUser: UserProfile;
}

export function UserManager({ currentUser }: UserManagerProps) {
  const { data: users, isLoading } = useUsers();
  const { data: departments } = useDepartments();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
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
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";
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
      };
      await createUser.mutateAsync(input);
      setForm((prev) => ({ ...prev, username: "", password: "", fullName: "", email: "", title: "" }));
      showToast("success", "Đã thêm nhân sự");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không tạo được người dùng");
    }
  }

  function handleDelete(userId: number) {
    deleteUser.mutate(userId, {
      onSuccess: () => showToast("success", "Đã xoá nhân sự"),
      onError: (err) =>
        showToast("error", err instanceof ApiRequestError ? err.message : "Không xoá được nhân sự"),
    });
  }

  if (allowedLevels.length === 0) {
    return null; // EMPLOYEE has no user-management screen (mirrors the 403 the backend would return)
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Nhân sự</h2>

      {isLoading ? (
        <Skeleton rows={4} />
      ) : (
        <Table<UserSummary>
          columns={[
            { header: "Tên đăng nhập", cell: (u) => u.username },
            { header: "Họ tên", cell: (u) => u.fullName },
            { header: "Vai trò", cell: (u) => LEVEL_LABELS[u.authorityLevel] },
            { header: "Chức danh", cell: (u) => u.title ?? "-" },
            {
              header: "",
              cell: (u) => (
                <Button variant="danger" onClick={() => handleDelete(u.id)} loading={deleteUser.isPending}>
                  Xoá
                </Button>
              ),
            },
          ]}
          rows={users ?? []}
          getRowKey={(u) => u.id}
          emptyState={
            <EmptyState
              title="Chưa có nhân sự nào trong phạm vi của bạn"
              description="Thêm nhân sự đầu tiên bằng form bên dưới."
            />
          }
        />
      )}

      <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 rounded border border-gray-200 p-4 sm:grid-cols-2">
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

        <div className="sm:col-span-2">
          <Button type="submit" loading={createUser.isPending}>
            Thêm nhân sự
          </Button>
        </div>
      </form>
      {errorMessage && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
