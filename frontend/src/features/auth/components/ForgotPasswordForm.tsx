"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { AnimatedCheck } from "@/components/ui/AnimatedCheck";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StepProgress } from "@/components/ui/StepProgress";
import { StepTransition } from "@/components/ui/StepTransition";
import { ApiRequestError } from "@/lib/api/client";
import { useForgotPassword, useResetPassword } from "../hooks/useAuth";

type Step = "request" | "reset" | "done";

const STEPS: { id: Step; label: string }[] = [
  { id: "request", label: "Nhận mã" },
  { id: "reset", label: "Mật khẩu mới" },
  { id: "done", label: "Hoàn tất" },
];

const RESEND_COOLDOWN_SECONDS = 60;
const REDIRECT_AFTER_SECONDS = 4;

/**
 * Three steps: request an OTP, submit it with a new password, then a short confirmation that leads back to the login
 * page. People often forget which username they chose, so the first field takes a username or the account's email.
 * Step 1 always shows the same generic message on success - the backend never reveals whether the account exists
 * (see AuthController/AuthServiceImpl), so this screen must not either.
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
  const [redirectIn, setRedirectIn] = useState(REDIRECT_AFTER_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  // After a successful reset: count down, then go to the login page (the button there skips the wait).
  useEffect(() => {
    if (step !== "done") return;
    if (redirectIn <= 0) {
      router.push("/login?open=login");
      return;
    }
    const timer = window.setTimeout(() => setRedirectIn((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [step, redirectIn, router]);

  async function handleRequestOtp(event: React.SyntheticEvent) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await forgotPassword.mutateAsync(username);
      setInfoMessage(
        "Nếu tài khoản tồn tại, mã OTP đã được gửi tới email đã đăng ký. Hãy kiểm tra cả thư mục spam.",
      );
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
      setStep("done");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không đặt lại được mật khẩu");
    }
  }

  const confirmTyped = confirmPassword !== "";
  const passwordsMatch = confirmPassword === newPassword;

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <StepProgress steps={STEPS} currentId={step} label="Các bước đặt lại mật khẩu" />

      <StepTransition
        stepKey={step}
        index={STEPS.findIndex((s) => s.id === step)}
        className="w-full"
      >
        {step === "request" && (
          <form onSubmit={handleRequestOtp} className="flex w-full flex-col gap-4">
            <Input
              label="Tên đăng nhập hoặc email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            <Button type="submit" loading={forgotPassword.isPending}>
              Gửi mã OTP
            </Button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="flex w-full flex-col gap-4">
            {infoMessage && <Alert tone="success">{infoMessage}</Alert>}
            <Input
              label="Mã OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
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
            <div className="flex flex-col gap-1">
              <Input
                label="Nhập lại mật khẩu mới"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <p
                aria-live="polite"
                className={`min-h-4 text-xs transition-colors duration-150 ${passwordsMatch ? "text-success-text" : "text-danger-text"}`}
              >
                {!confirmTyped ? null : passwordsMatch ? "Mật khẩu khớp" : "Mật khẩu chưa khớp"}
              </p>
            </div>
            <Button type="submit" loading={resetPassword.isPending}>
              Đặt lại mật khẩu
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep("request");
                  setErrorMessage(null);
                }}
                className="text-fg-muted hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                Đổi tên đăng nhập
              </button>
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={cooldown > 0 || forgotPassword.isPending}
                className="text-fg-muted hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
              >
                {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : "Gửi lại mã"}
              </button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="flex w-full flex-col items-center gap-3 py-2 text-center" role="status">
            <AnimatedCheck label="Đã đặt lại mật khẩu" />
            <h2 className="text-lg font-semibold text-fg">Đã đặt lại mật khẩu</h2>
            <p className="text-sm text-fg-muted">
              Bạn có thể đăng nhập bằng mật khẩu mới. Tự chuyển về trang đăng nhập sau {redirectIn}
              s.
            </p>
            <Button onClick={() => router.push("/login?open=login")}>Đăng nhập ngay</Button>
          </div>
        )}
      </StepTransition>

      {errorMessage && (
        <Alert tone="danger" className="w-full">
          {errorMessage}
        </Alert>
      )}
    </div>
  );
}
