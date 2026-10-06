"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiRequestError } from "@/lib/api/client";
import { useForgotPassword, useResetPassword } from "../hooks/useAuth";

type Step = "request" | "reset";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Two steps: request an OTP, then submit it with a new password. People often forget which username
 * they chose, so the first field takes a username or the account's email. Step 1 always shows the same
 * generic message on success - the backend never reveals whether the account exists (see
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
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleRequestOtp(event: React.SyntheticEvent) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await forgotPassword.mutateAsync(username);
      setInfoMessage("Nếu tài khoản tồn tại, mã OTP đã được gửi tới email đã đăng ký. Hãy kiểm tra cả thư mục spam.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
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
          label="Tên đăng nhập hoặc email"
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
        onClick={handleRequestOtp}
        disabled={cooldown > 0 || forgotPassword.isPending}
        className="text-center text-sm text-gray-500 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
      >
        {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : "Gửi lại mã"}
      </button>
    </form>
  );
}
