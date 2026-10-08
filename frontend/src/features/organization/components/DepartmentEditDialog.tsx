"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { DepartmentAppearancePicker } from "../departmentAppearance";
import { useUpdateDepartment } from "../hooks/useOrganization";
import type { Department } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
/** Rename a department and change its description, colour and icon (executive, or that department's head). */
export function DepartmentEditDialog({
  department,
  onClose,
}: {
  department: Department;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const update = useUpdateDepartment();
  const { showToast } = useToast();
  const [name, setName] = useState(department.name);
  const [description, setDescription] = useState(department.description ?? "");
  const [look, setLook] = useState({
    name: department.name,
    color: department.color ?? "",
    icon: department.icon ?? "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await update.mutateAsync({
        id: department.id,
        input: {
          name: name.trim(),
          description: description.trim() || undefined,
          color: look.color || undefined,
          icon: look.icon || undefined,
        },
      });
      showToast("success", t("organization.departmentEditDialog.departmentUpdated"));
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof ApiRequestError ? err.message : t("organization.departmentEditDialog.couldnTUpdateTheDepartment"),
      );
    }
  }

  return (
    <Modal title={t("organization.departmentEditDialog.editDepartment")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label={t("organization.departmentEditDialog.departmentName")}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setLook({ ...look, name: e.target.value });
          }}
          required
          maxLength={200}
        />
        <Input
          label={t("common.descriptionOptional")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
        <DepartmentAppearancePicker value={look} onChange={setLook} />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={update.isPending}>
            {t("common.save")}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
