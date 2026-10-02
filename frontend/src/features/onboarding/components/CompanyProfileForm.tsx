"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useCompany, useUpdateCompany, useUploadCompanyLogo } from "../hooks/useOnboarding";
import { LOGO_ACCEPT, MAX_LOGO_BYTES } from "../types";
import { CompanyLogo } from "./CompanyLogo";

const LOGO_TYPES = LOGO_ACCEPT.split(",");

/** EXECUTIVE-only - the backend independently enforces this too (CompanyController). */
export function CompanyProfileForm({ currentUser }: { currentUser: UserProfile }) {
  const { data: company } = useCompany();
  const updateCompany = useUpdateCompany();
  const uploadLogo = useUploadCompanyLogo();
  const { showToast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Seed the form once the company has loaded (and again if it is changed elsewhere).
  useEffect(() => {
    if (company) {
      setName(company.name);
      setContactEmail(company.contactEmail ?? "");
    }
  }, [company]);

  if (currentUser.authorityLevel !== "EXECUTIVE") {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await updateCompany.mutateAsync({ name: name.trim(), contactEmail: contactEmail.trim() || undefined });
      showToast("success", "Đã lưu thông tin công ty");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không lưu được thông tin công ty");
    }
  }

  function handlePickLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      showToast("error", "Logo phải là ảnh PNG, JPEG hoặc WebP");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      showToast("error", "Logo tối đa 2MB");
      return;
    }
    uploadLogo.mutate(file, {
      onSuccess: () => showToast("success", "Đã cập nhật logo"),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không tải được logo"),
    });
  }

  return (
    <section className="flex flex-col gap-3" data-tour="company-profile">
      <h2 className="text-lg font-semibold text-gray-900">Thông tin công ty</h2>

      <div className="flex items-center gap-3">
        <CompanyLogo name={company?.name ?? currentUser.companyName} logoUrl={company?.logoUrl ?? null} size="lg" />
        <div className="flex flex-col gap-1">
          <input ref={logoInputRef} type="file" accept={LOGO_ACCEPT} onChange={handlePickLogo} className="hidden" aria-label="Chọn logo công ty" />
          <Button variant="secondary" onClick={() => logoInputRef.current?.click()} loading={uploadLogo.isPending}>
            {company?.logoUrl ? "Đổi logo" : "Tải logo lên"}
          </Button>
          <span className="text-xs text-gray-400">PNG, JPEG, WebP · tối đa 2MB</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
        <Input label="Tên công ty" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
        <Input label="Email doanh nghiệp" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <Button type="submit" loading={updateCompany.isPending}>
          Lưu
        </Button>
      </form>
    </section>
  );
}
