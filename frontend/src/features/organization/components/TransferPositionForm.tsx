"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { AuthorityLevel } from "@/features/auth/types";
import { useDepartments, useTeams, useUpdatePosition } from "../hooks/useOrganization";
import type { UserSummary } from "../types";

const LEVEL_LABELS: Record<AuthorityLevel, string> = {
  EXECUTIVE: "Điều hành (CEO/CTO/COO...)",
  DEPARTMENT_HEAD: "Trưởng phòng",
  TEAM_LEAD: "Trưởng nhóm",
  EMPLOYEE: "Nhân viên",
};

interface TransferPositionFormProps {
  user: UserSummary;
  allowedLevels: AuthorityLevel[];
  onDone: () => void;
}

/**
 * Inline row form rather than a Modal - the design system doesn't have one yet (see
 * components/ui/README.md) and this is the only place that would need it so far; add a real
 * Modal primitive if a second use case shows up (CLAUDE.md section 29).
 */
export function TransferPositionForm({ user, allowedLevels, onDone }: TransferPositionFormProps) {
  const { data: departments } = useDepartments();
  const updatePosition = useUpdatePosition();
  const { showToast } = useToast();

  const [authorityLevel, setAuthorityLevel] = useState<AuthorityLevel>(user.authorityLevel);
  const [title, setTitle] = useState(user.title ?? "");
  const [departmentId, setDepartmentId] = useState<number | undefined>(user.departmentId ?? undefined);
  const [teamId, setTeamId] = useState<number | undefined>(user.teamId ?? undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: teamsInChosenDepartment } = useTeams(departmentId ?? -1);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await updatePosition.mutateAsync({
        id: user.id,
        input: { authorityLevel, title: title || undefined, departmentId, teamId },
      });
      showToast("success", "Đã chuyển vị trí");
      onDone();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không chuyển được vị trí");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded border border-gray-200 bg-surface-muted p-4 sm:grid-cols-2"
    >
      <Select
        label="Vai trò mới"
        value={authorityLevel}
        onChange={(e) => setAuthorityLevel(e.target.value as AuthorityLevel)}
        options={allowedLevels.map((level) => ({ value: level, label: LEVEL_LABELS[level] }))}
      />
      <Input label="Chức danh hiển thị" value={title} onChange={(e) => setTitle(e.target.value)} />

      {authorityLevel !== "EXECUTIVE" && (
        <Select
          label="Phòng ban"
          value={departmentId ? String(departmentId) : ""}
          onChange={(e) => {
            setDepartmentId(e.target.value ? Number(e.target.value) : undefined);
            setTeamId(undefined);
          }}
          options={[
            { value: "", label: "-- Chọn phòng ban --" },
            ...(departments ?? []).map((d) => ({ value: String(d.id), label: d.name })),
          ]}
        />
      )}

      {(authorityLevel === "TEAM_LEAD" || authorityLevel === "EMPLOYEE") && departmentId && (
        <Select
          label="Nhóm (tuỳ chọn cho nhân viên, bắt buộc cho trưởng nhóm)"
          value={teamId ? String(teamId) : ""}
          onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : undefined)}
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
        <Button type="submit" loading={updatePosition.isPending}>
          Xác nhận chuyển
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Huỷ
        </Button>
      </div>
    </form>
  );
}
