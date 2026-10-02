"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useChangePassword } from "../hooks/useSettings";

export function ChangePasswordForm() {
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
      setErrorMessage("Mật khẩu mới nhập lại không khớp");
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("success", "Đã đổi mật khẩu");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không đổi được mật khẩu");
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-gray-900">Đổi mật khẩu</h2>
      <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
        <Input
          label="Mật khẩu hiện tại"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Input
          label="Mật khẩu mới"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Input
          label="Nhập lại mật khẩu mới"
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
          Đổi mật khẩu
        </Button>
      </form>
    </section>
  );
}
