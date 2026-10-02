"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useCreateDepartment, useDepartments } from "../hooks/useOrganization";

interface DepartmentManagerProps {
  currentUser: UserProfile;
}

/**
 * Medium square tiles (Phase 7 plan) instead of a table — clicking one opens its own detail page
 * (`/dashboard/departments/[id]`) rather than expanding inline. Creating a department is still
 * EXECUTIVE-only — the backend independently enforces this too (`DepartmentController.create`'s
 * `@PreAuthorize("hasAuthority('EXECUTIVE')")`, unchanged by this phase).
 */
export function DepartmentManager({ currentUser }: DepartmentManagerProps) {
  const { data: departments, isLoading } = useDepartments();
  const createDepartment = useCreateDepartment();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createDepartment.mutateAsync({ name: form.name, description: form.description || undefined });
      setForm({ name: "", description: "" });
      setCreating(false);
      showToast("success", "Đã tạo phòng ban");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không tạo được phòng ban");
    }
  }

  if (isLoading) {
    return <Skeleton rows={3} />;
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Phòng ban</h2>

      {(departments ?? []).length === 0 && !isExecutive ? (
        <EmptyState title="Chưa có phòng ban nào" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {(departments ?? []).map((department) => (
            <Link
              key={department.id}
              href={`/dashboard/departments/${department.id}`}
              className="card-interactive flex aspect-square flex-col justify-between rounded border border-gray-200 bg-white p-4 shadow-sm hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <p className="font-semibold text-gray-900">{department.name}</p>
              {department.description && (
                <p className="line-clamp-3 text-xs text-gray-500">{department.description}</p>
              )}
            </Link>
          ))}

          {isExecutive && !creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded border border-dashed border-gray-300 text-gray-400 transition-all duration-150 hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Plus size={28} aria-hidden />
              <span className="text-xs">Tạo phòng ban</span>
            </button>
          )}
        </div>
      )}

      {isExecutive && creating && (
        <form onSubmit={handleCreate} className="flex max-w-sm flex-col gap-3 rounded border border-gray-200 p-4">
          <Input label="Tên phòng ban" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input
            label="Mô tả (tuỳ chọn)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {errorMessage && (
            <p role="alert" className="text-sm text-danger">
              {errorMessage}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" loading={createDepartment.isPending}>
              Tạo
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
              Huỷ
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
