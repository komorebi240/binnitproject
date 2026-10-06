"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ApiRequestError } from "@/lib/api/client";
import { useDeleteUser } from "../hooks/useOrganization";
import type { UserSummary } from "../types";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_PASSWORD: "Mật khẩu của bạn không đúng.",
  TOO_MANY_REQUESTS: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.",
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
      setErrorMessage(
        err instanceof ApiRequestError ? (ERROR_MESSAGES[err.code] ?? err.message) : "Không xoá được nhân sự",
      );
    }
  }

  return (
    <Modal title="Xoá nhân sự" onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Alert tone="danger">
          Bạn sắp xoá <strong>{user.fullName}</strong> ({user.username}). Tài khoản sẽ không đăng nhập được nữa và hành động này không thể hoàn tác.
        </Alert>
        <Input
          label={`Nhập "${user.username}" để xác nhận`}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
          required
        />
        <Input
          label="Mật khẩu của bạn"
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
            Huỷ
          </Button>
          <Button type="submit" variant="danger" loading={deleteUser.isPending} disabled={!confirmed}>
            Xoá nhân sự
          </Button>
        </div>
      </form>
    </Modal>
  );
}
