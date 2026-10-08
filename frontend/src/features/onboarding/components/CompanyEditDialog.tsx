"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useUpdateCompany } from "../hooks/useOnboarding";
import type { Company } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
const DESCRIPTION_MAX = 1000;

/** Name, business email and the short introduction shown on the company page (executives only; the backend enforces it too). */
export function CompanyEditDialog({ company, onClose }: { company: Company; onClose: () => void }) {
  const { t } = useI18n();
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
      showToast("success", t("onboarding.companyEditDialog.companyDetailsSaved"));
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("onboarding.companyEditDialog.couldnTSaveTheCompanyDetails"));
    }
  }

  return (
    <Modal title={t("onboarding.companyEditDialog.companyDetails")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label={t("onboarding.companyEditDialog.companyName")} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
        <Input label={t("onboarding.companyEditDialog.companyEmail")} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        <Textarea
          label={t("onboarding.companyEditDialog.shortDescription")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={DESCRIPTION_MAX}
          rows={5}
        />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={updateCompany.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
