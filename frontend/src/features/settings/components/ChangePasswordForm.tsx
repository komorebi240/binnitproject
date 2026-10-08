"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useChangePassword } from "../hooks/useSettings";

import { useI18n } from "@/lib/i18n/useI18n";
export function ChangePasswordForm() {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const changePassword = useChangePassword();
  const { showToast } = useToast();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage(t("common.theNewPasswordsDonTMatch"));
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("success", t("settings.changePasswordForm.passwordChanged"));
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("settings.changePasswordForm.couldnTChangeThePassword"));
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-fg">{t("common.changePassword")}</h2>
      <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
        <Input
          label={t("settings.changePasswordForm.currentPassword")}
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Input
          label={t("common.newPassword")}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Input
          label={t("common.reEnterTheNewPassword")}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <Button type="submit" loading={changePassword.isPending}>
          {t("common.changePassword")}
        </Button>
      </form>
    </section>
  );
}
