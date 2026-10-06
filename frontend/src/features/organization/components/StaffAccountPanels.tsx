"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import {
  useConfirmStaffEmailChange,
  useRequestStaffEmailChange,
  useSendStaffPasswordReset,
} from "../hooks/useOrganization";
import type { UserSummary } from "../types";

/**
 * The manager never sees or sets a password: the staff member gets the same emailed code as "Quên mật
 * khẩu" and chooses their own. Only the people the server lets manage this user can do it.
 */
export function ResetPasswordPanel({ user }: { user: UserSummary }) {
  const sendReset = useSendStaffPasswordReset();
  const { showToast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSend() {
    setErrorMessage(null);
    sendReset.mutate(user.id, {
      onSuccess: () => showToast("success", `Đã gửi email đặt lại mật khẩu cho ${user.fullName}`),
      onError: (err) =>
        setErrorMessage(err instanceof ApiRequestError ? err.message : "Không gửi được email"),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-fg-soft">
        Gửi mã đặt lại mật khẩu đến email đã đăng ký của <strong>{user.fullName}</strong>. Họ nhập
        mã ở trang &ldquo;Quên mật khẩu&rdquo; để tự đặt mật khẩu mới; bạn sẽ không biết mật khẩu
        của họ.
      </p>
      {errorMessage && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}
      <div>
        <Button variant="secondary" onClick={handleSend} loading={sendReset.isPending}>
          Gửi email đặt lại mật khẩu
        </Button>
      </div>
    </div>
  );
}

/**
 * Two steps, because the new address must be proven to be reachable: first a code is mailed to the
 * NEW address, then the code (which the staff member reads from that mailbox) confirms the change.
 */
export function ChangeEmailPanel({ user }: { user: UserSummary }) {
  const requestChange = useRequestStaffEmailChange();
  const confirmChange = useConfirmStaffEmailChange();
  const { showToast } = useToast();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function fail(fallback: string) {
    return (err: unknown) =>
      setErrorMessage(err instanceof ApiRequestError ? err.message : fallback);
  }

  function handleRequest(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    requestChange.mutate(
      { userId: user.id, email: email.trim() },
      { onSuccess: () => setStep("code"), onError: fail("Không gửi được mã xác nhận") },
    );
  }

  function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    confirmChange.mutate(
      { userId: user.id, otp: code.trim() },
      {
        onSuccess: () => {
          showToast("success", `Đã đổi email của ${user.fullName}`);
          setStep("email");
          setEmail("");
          setCode("");
        },
        onError: fail("Mã không đúng hoặc đã hết hạn"),
      },
    );
  }

  if (step === "email") {
    return (
      <form onSubmit={handleRequest} className="flex flex-col gap-2">
        <p className="text-sm text-fg-soft">
          Nhập email mới của <strong>{user.fullName}</strong>. Một mã xác nhận sẽ được gửi đến email
          mới đó.
        </p>
        <Input
          label="Email mới"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={200}
        />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <div>
          <Button type="submit" variant="secondary" loading={requestChange.isPending}>
            Gửi mã xác nhận
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleConfirm} className="flex flex-col gap-2">
      <p className="text-sm text-fg-soft">
        Đã gửi mã 6 số đến <strong>{email.trim()}</strong>. Nhờ {user.fullName} đọc mã trong hộp thư
        đó và nhập vào đây (mã có hiệu lực 15 phút). Email cũ sẽ nhận thông báo khi đổi xong.
      </p>
      <Input
        label="Mã xác nhận"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        required
      />
      {errorMessage && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" loading={confirmChange.isPending} disabled={code.length !== 6}>
          Xác nhận đổi email
        </Button>
        <Button type="button" variant="secondary" onClick={() => setStep("email")}>
          Nhập lại email
        </Button>
      </div>
    </form>
  );
}
