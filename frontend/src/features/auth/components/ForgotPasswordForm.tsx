"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiRequestError } from "@/lib/api/client";
import { useForgotPassword, useResetPassword } from "../hooks/useAuth";

type Step = "request" | "reset";

/**
 * Two steps: request an OTP, then submit it with a new password. Step 1 always shows the same
 * generic message on success — the backend never reveals whether the username exists (see
 * AuthController/AuthServiceImpl), so this screen must not either.
 */
export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("request");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const forgotPassword = useForgotPassword();
  const resetPassword = useResetPassword();
  const router = useRouter();

  async function handleRequestOtp(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await forgotPassword.mutateAsync(username);
      setInfoMessage("Nếu tài khoản tồn tại, mã OTP đã được gửi tới email đã đăng ký.");
      setStep("reset");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không gửi được yêu cầu");
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage("Mật khẩu mới nhập lại không khớp");
      return;
    }

    try {
      await resetPassword.mutateAsync({ username, otp, newPassword });
      router.push("/login");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không đặt lại được mật khẩu");
    }
  }

  if (step === "request") {
    return (
      <form onSubmit={handleRequestOtp} className="flex w-full max-w-sm flex-col gap-4">
        <Input
          label="Tên đăng nhập"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <Button type="submit" loading={forgotPassword.isPending}>
          Gửi mã OTP
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleResetPassword} className="flex w-full max-w-sm flex-col gap-4">
      {infoMessage && (
        <p role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-800">
          {infoMessage}
        </p>
      )}
      <Input label="Mã OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required />
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
      <Button type="submit" loading={resetPassword.isPending}>
        Đặt lại mật khẩu
      </Button>
      <button
        type="button"
        onClick={() => setStep("request")}
        className="text-center text-sm text-gray-500 hover:underline"
      >
        Gửi lại mã / đổi tên đăng nhập
      </button>
    </form>
  );
}
