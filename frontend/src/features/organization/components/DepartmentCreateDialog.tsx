"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { DepartmentAppearancePicker } from "../departmentAppearance";
import { useCreateDepartment } from "../hooks/useOrganization";

import { useI18n } from "@/lib/i18n/useI18n";
/** Create a department in a window of its own: name, description, colour and icon, with ready-made suggestions (executives only; the backend enforces it too). */
export function DepartmentCreateDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const createDepartment = useCreateDepartment();
  const { showToast } = useToast();
  const [description, setDescription] = useState("");
  // The name lives in `look` too: the appearance picker shows it in the preview and a suggestion chip fills it in.
  const [look, setLook] = useState({ name: "", color: "", icon: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createDepartment.mutateAsync({
        name: look.name.trim(),
        description: description.trim() || undefined,
        color: look.color || undefined,
        icon: look.icon || undefined,
      });
      showToast("success", t("organization.departmentManager.departmentCreated"));
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("organization.departmentManager.couldnTCreateTheDepartment"));
    }
  }

  return (
    <Modal title={t("common.createADepartment")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label={t("organization.departmentEditDialog.departmentName")}
          value={look.name}
          onChange={(e) => setLook({ ...look, name: e.target.value })}
          required
          maxLength={200}
          autoFocus
        />
        <Input
          label={t("common.descriptionOptional")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
        <DepartmentAppearancePicker showPresets value={look} onChange={setLook} />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={createDepartment.isPending}>
            {t("organization.departmentManager.create")}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
