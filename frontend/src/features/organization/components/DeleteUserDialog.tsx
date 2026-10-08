"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ApiRequestError } from "@/lib/api/client";
import { useDeleteUser } from "../hooks/useOrganization";
import type { UserSummary } from "../types";

import { RichText } from "@/components/i18n/RichText";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useI18n } from "@/lib/i18n/useI18n";
const ERROR_KEYS: Record<string, TranslationKey> = {
  INVALID_PASSWORD: "organization.deleteUserDialog.yourPasswordIsIncorrect",
  TOO_MANY_REQUESTS: "organization.deleteUserDialog.youVeTriedTooManyTimes",
};

interface DeleteUserDialogProps {
  user: UserSummary;
  onClose: () => void;
  onDeleted: () => void;
}

/**
 * Deleting an account is destructive, so two checks sit in front of it: retype the account's
 * username (so the wrong row can't be deleted by a slip) and re-enter YOUR password (a session left
 * open on a shared screen can't delete people). The server verifies the password; this only gathers it.
 */
export function DeleteUserDialog({ user, onClose, onDeleted }: DeleteUserDialogProps) {
  const { t } = useI18n();
  const deleteUser = useDeleteUser();
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const confirmed = confirmation.trim() === user.username && password.length > 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!confirmed) return;
    setErrorMessage(null);
    try {
      await deleteUser.mutateAsync({ id: user.id, password });
      onDeleted();
    } catch (err) {
      setPassword("");
      const knownKey = err instanceof ApiRequestError ? ERROR_KEYS[err.code] : undefined;
      if (knownKey) setErrorMessage(t(knownKey));
      else setErrorMessage(err instanceof ApiRequestError ? err.message : t("organization.deleteUserDialog.couldnTDeleteThePerson"));
    }
  }

  return (
    <Modal title={t("common.deleteAPerson")} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Alert tone="danger">
          <RichText
            text={t("organization.deleteUserDialog.deleteWarning", { username: user.username })}
            values={{ name: <strong>{user.fullName}</strong> }}
          />
        </Alert>
        <Input
          label={t("organization.deleteUserDialog.typeUsernameToConfirm", { username: user.username })}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
          required
        />
        <Input
          label={t("organization.deleteUserDialog.yourPassword")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
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
          <Button type="submit" variant="danger" loading={deleteUser.isPending} disabled={!confirmed}>
            {t("common.deleteAPerson")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
