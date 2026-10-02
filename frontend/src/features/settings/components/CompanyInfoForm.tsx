"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useUpdateCompanyName } from "../hooks/useSettings";

interface CompanyInfoFormProps {
  currentUser: UserProfile;
}

/** EXECUTIVE-only — the backend independently enforces this too (CompanyController). */
export function CompanyInfoForm({ currentUser }: CompanyInfoFormProps) {
  const [name, setName] = useState(currentUser.companyName);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const updateCompanyName = useUpdateCompanyName();
  const { showToast } = useToast();

  if (currentUser.authorityLevel !== "EXECUTIVE") {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await updateCompanyName.mutateAsync({ name });
      showToast("success", "Đã đổi tên công ty");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không đổi được tên công ty");
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-gray-900">Thông tin công ty</h2>
      <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
        <Input label="Tên công ty" value={name} onChange={(e) => setName(e.target.value)} required />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <Button type="submit" loading={updateCompanyName.isPending}>
          Lưu
        </Button>
      </form>
    </section>
  );
}
