"use client";

import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useTabs } from "@/components/layout/TabsContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Highlight } from "@/components/ui/Highlight";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { matchesAllWords } from "@/lib/textMatch";
import { useDepartments, useUpdatePosition, useUsers } from "../hooks/useOrganization";
import type { UserSummary } from "../types";

interface AddExistingStaffDialogProps {
  departmentId: number;
  departmentName: string;
  onClose: () => void;
}

/**
 * Puts staff who already exist into this department. Only employees are offered: moving a team lead or a
 * department head also changes their team/role, which belongs in the staff window. Someone who is not on
 * the list yet is created on the Nhân sự page, which this dialog links to.
 */
export function AddExistingStaffDialog({ departmentId, departmentName, onClose }: AddExistingStaffDialogProps) {
  const { data: users, isLoading } = useUsers();
  const { data: departments } = useDepartments();
  const updatePosition = useUpdatePosition();
  const { navigateActiveTab } = useTabs();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);

  const departmentLabel = (id: number | null) => departments?.find((d) => d.id === id)?.name;
  const candidates = (users ?? [])
    .filter((u) => u.active && u.authorityLevel === "EMPLOYEE" && u.departmentId !== departmentId)
    .filter((u) => matchesAllWords(`${u.fullName} ${u.username}`, query));

  function handleAdd(user: UserSummary) {
    setPendingId(user.id);
    updatePosition.mutate(
      { id: user.id, input: { authorityLevel: user.authorityLevel, title: user.title ?? undefined, departmentId } },
      {
        onSuccess: () => showToast("success", `Đã thêm ${user.fullName} vào ${departmentName}`),
        onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không thêm được nhân sự"),
        onSettled: () => setPendingId(null),
      },
    );
  }

  function goCreate() {
    onClose();
    navigateActiveTab("/dashboard/users");
  }

  return (
    <Modal title={`Thêm nhân sự vào ${departmentName}`} onClose={onClose}>
      <label className="relative block">
        <span className="sr-only">Tìm nhân sự</span>
        <MagnifyingGlass size={16} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc tên đăng nhập..."
          className="w-full rounded border border-gray-200 bg-white py-2 pl-8 pr-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
      </label>

      {isLoading ? (
        <Skeleton rows={3} />
      ) : candidates.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">
          {query ? "Không có nhân sự nào khớp." : "Chưa có nhân sự nào khác để thêm vào phòng ban này."}
        </p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {candidates.map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3 rounded px-2 py-1.5 hover:bg-surface-muted">
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar avatarUrl={user.avatarUrl} fullName={user.fullName} presenceStatus={user.presenceStatus} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-900">
                    <Highlight text={user.fullName} query={query} />
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {departmentLabel(user.departmentId) ?? "Chưa có phòng ban"} · {user.username}
                  </span>
                </span>
              </span>
              <Button variant="secondary" onClick={() => handleAdd(user)} loading={pendingId === user.id} disabled={pendingId !== null}>
                Thêm
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <p className="text-sm text-gray-500">Chưa có người cần tìm?</p>
        <Button variant="secondary" onClick={goCreate}>
          Tạo nhân sự mới ở trang Nhân sự
        </Button>
      </div>
    </Modal>
  );
}
