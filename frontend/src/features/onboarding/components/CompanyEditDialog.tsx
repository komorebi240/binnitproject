"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useUpdateCompany } from "../hooks/useOnboarding";
import type { Company } from "../types";

const DESCRIPTION_MAX = 1000;

/** Name, business email and the short introduction shown on the company page (executives only; the backend enforces it too). */
export function CompanyEditDialog({ company, onClose }: { company: Company; onClose: () => void }) {
  const updateCompany = useUpdateCompany();
  const { showToast } = useToast();
  const [name, setName] = useState(company.name);
  const [contactEmail, setContactEmail] = useState(company.contactEmail ?? "");
  const [description, setDescription] = useState(company.description ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await updateCompany.mutateAsync({
        name: name.trim(),
        contactEmail: contactEmail.trim() || undefined,
        description: description.trim() || undefined,
      });
      showToast("success", "Đã lưu thông tin công ty");
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không lưu được thông tin công ty");
    }
  }

  return (
    <Modal title="Thông tin công ty" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Tên công ty" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
        <Input label="Email doanh nghiệp" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label htmlFor="company-description" className="text-sm font-medium text-gray-700">
            Giới thiệu ngắn
          </label>
          <textarea
            id="company-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={5}
            className="rounded border border-gray-300 px-3 py-2 text-sm transition-colors duration-150 hover:border-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          />
          <span className="self-end text-xs text-gray-400">
            {description.length}/{DESCRIPTION_MAX}
          </span>
        </div>
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" loading={updateCompany.isPending}>
            Lưu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
