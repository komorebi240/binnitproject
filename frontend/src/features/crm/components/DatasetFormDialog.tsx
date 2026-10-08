"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import type { UserProfile } from "@/features/auth/types";
import { useDepartments } from "@/features/organization/hooks/useOrganization";
import { useI18n } from "@/lib/i18n/useI18n";
import { crmErrorMessage } from "../crmErrors";
import { SOURCE_TYPES, SOURCE_TYPE_KEYS, type CrmSourceType, type Dataset, type SaveDatasetInput } from "../types";

/** The value of the department select that means "executives only". */
const EXECUTIVES_ONLY = "";

/**
 * One window for creating a dataset and for editing one's details: its name, where its customers came from, a note, and
 * who may use it (a department, or executives only). A department head can only choose their own department.
 */
export function DatasetFormDialog({
  currentUser,
  dataset,
  onSave,
  saving,
  onClose,
}: {
  currentUser: UserProfile;
  /** The dataset being edited; omitted when creating. */
  dataset?: Dataset;
  onSave: (input: SaveDatasetInput) => Promise<unknown>;
  saving: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { data: departments } = useDepartments();
  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";

  const [name, setName] = useState(dataset?.name ?? "");
  const [sourceType, setSourceType] = useState<CrmSourceType>(dataset?.sourceType ?? "EXCEL");
  const [description, setDescription] = useState(dataset?.description ?? "");
  const [departmentId, setDepartmentId] = useState<string>(
    dataset ? (dataset.departmentId?.toString() ?? EXECUTIVES_ONLY) : (currentUser.departmentId?.toString() ?? EXECUTIVES_ONLY),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const departmentOptions = isExecutive
    ? [{ value: EXECUTIVES_ONLY, label: t("crm.dataset.executivesOnly") }, ...(departments ?? []).map((d) => ({ value: String(d.id), label: d.name }))]
    : [{ value: String(currentUser.departmentId ?? ""), label: currentUser.departmentName ?? "" }];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await onSave({
        name: name.trim(),
        sourceType,
        description: description.trim() || undefined,
        departmentId: departmentId === EXECUTIVES_ONLY ? null : Number(departmentId),
      });
      showToast("success", dataset ? t("crm.dataset.updated") : t("crm.dataset.created"));
      onClose();
    } catch (err) {
      setErrorMessage(crmErrorMessage(err, t("crm.dataset.couldNotSave"), t));
    }
  }

  return (
    <Modal title={dataset ? t("crm.dataset.edit") : t("crm.dataset.create")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label={t("crm.dataset.name")} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required autoFocus />
        <Select
          label={t("crm.dataset.source")}
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as CrmSourceType)}
          options={SOURCE_TYPES.map((type) => ({ value: type, label: t(SOURCE_TYPE_KEYS[type]) }))}
        />
        <Select
          label={t("crm.dataset.whoCanUse")}
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          options={departmentOptions}
          disabled={!isExecutive}
        />
        <Input label={t("common.descriptionOptional")} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={saving}>
            {dataset ? t("common.save") : t("crm.dataset.createAction")}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
