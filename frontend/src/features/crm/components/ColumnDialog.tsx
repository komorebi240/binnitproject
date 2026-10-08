"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/lib/i18n/useI18n";
import { COLUMN_TYPES, COLUMN_TYPE_KEYS, type Column, type CrmColumnType } from "../types";

/**
 * Adds a column (name and type) or renames one. A column's type is fixed when it is created: to change it, add a new
 * column, so the values already stored never have to be reinterpreted.
 */
export function ColumnDialog({
  column,
  saving,
  errorMessage,
  onSave,
  onClose,
}: {
  /** The column being renamed; omitted when adding. */
  column?: Column;
  saving: boolean;
  errorMessage: string | null;
  onSave: (name: string, dataType: CrmColumnType) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(column?.name ?? "");
  const [dataType, setDataType] = useState<CrmColumnType>(column?.dataType ?? "TEXT");

  return (
    <Modal title={column ? t("crm.column.rename") : t("crm.column.add")} onClose={onClose} widthClassName="max-w-md">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(name.trim(), dataType);
        }}
        className="flex flex-col gap-3"
      >
        <Input label={t("crm.column.name")} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required autoFocus />
        {!column && (
          <Select
            label={t("crm.column.type")}
            value={dataType}
            onChange={(e) => setDataType(e.target.value as CrmColumnType)}
            options={COLUMN_TYPES.map((type) => ({ value: type, label: t(COLUMN_TYPE_KEYS[type]) }))}
          />
        )}
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={saving}>
            {column ? t("common.save") : t("crm.column.addAction")}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
