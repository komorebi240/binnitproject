"use client";

import { Button } from "./Button";
import { Modal } from "./Modal";

import { useI18n } from "@/lib/i18n/useI18n";
interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Design-system primitive (CLAUDE.md section 26): asks before something that cannot be undone. */
export function ConfirmDialog({ title, message, confirmLabel, danger = false, loading = false, onConfirm, onClose }: ConfirmDialogProps) {
  const { t } = useI18n();
  return (
    <Modal title={title} onClose={onClose} widthClassName="max-w-md">
      <p className="text-sm text-fg-soft">{message}</p>
      <div className="flex gap-2">
        <Button type="button" variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      </div>
    </Modal>
  );
}
