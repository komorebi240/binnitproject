"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiRequestError } from "@/lib/api/client";
import { uploadCompanyLogo } from "../api/onboardingApi";
import { onboardingErrorMessage } from "../errors";
import { useRegisterCompany, useRequestRegistrationOtp, useVerifyRegistrationOtp } from "../hooks/useOnboarding";
import { LOGO_ACCEPT, MAX_LOGO_BYTES } from "../types";

type Step = "email" | "otp" | "company" | "account";

const STEPS: { id: Step; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "otp", label: "Xác minh" },
  { id: "company", label: "Doanh nghiệp" },
  { id: "account", label: "Quản trị viên" },
];

const RESEND_COOLDOWN_SECONDS = 60;
const LOGO_TYPES = LOGO_ACCEPT.split(",");

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex w-full max-w-sm items-center justify-between text-xs" aria-label="Các bước đăng ký">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.id} className="flex flex-1 flex-col items-center gap-1" aria-current={active ? "step" : undefined}>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-150 ${
                active
                  ? "gradient-surface border-transparent bg-gradient-to-r from-primary to-primaryEnd text-primary-foreground"
                  : done
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-300 text-gray-400"
              }`}
            >
              {done ? "✓" : index + 1}
            </span>
            <span className={active ? "font-medium text-gray-900" : "text-gray-500"}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Four steps: verify the admin's email by OTP, describe the company (name, contact email, logo),
 * create the administrator account, then land on the dashboard where the guided tour starts. The
 * verification token only lives in this component's state - it is never put in the URL or storage.
 */
export function RegisterWizard() {
  const router = useRouter();
  const requestOtp = useRequestRegistrationOtp();
  const verifyOtp = useVerifyRegistrationOtp();
  const registerCompany = useRegisterCompany();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!logo) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logo);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  function fail(err: unknown, fallback: string) {
    setErrorMessage(onboardingErrorMessage(err, fallback));
  }

  async function sendOtp(event?: React.SyntheticEvent) {
    event?.preventDefault();
    setErrorMessage(null);
    try {
      await requestOtp.mutateAsync(email.trim());
      setInfoMessage("Mã xác minh đã được gửi tới email của bạn (hiệu lực 10 phút).");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("otp");
    } catch (err) {
      fail(err, "Không gửi được mã xác minh");
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      setVerificationToken(await verifyOtp.mutateAsync({ email: email.trim(), otp }));
      setInfoMessage(null);
      setStep("company");
    } catch (err) {
      fail(err, "Mã xác minh không đúng");
    }
  }

  function handlePickLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!picked) return;
    if (!LOGO_TYPES.includes(picked.type)) {
      setErrorMessage("Logo phải là ảnh PNG, JPEG hoặc WebP");
      return;
    }
    if (picked.size > MAX_LOGO_BYTES) {
      setErrorMessage("Logo tối đa 2MB");
      return;
    }
    setErrorMessage(null);
    setLogo(picked);
  }

  function handleCompanyNext(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setStep("account");
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu nhập lại không khớp");
      return;
    }
    if (!verificationToken) {
      setStep("email");
      return;
    }

    try {
      await registerCompany.mutateAsync({
        verificationToken,
        companyName: companyName.trim(),
        contactEmail: contactEmail.trim() || undefined,
        username: username.trim(),
        fullName: fullName.trim(),
        password,
      });
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "INVALID_VERIFICATION") {
        // Token expired/used: the account was NOT created, so start verification again.
        setVerificationToken(null);
        setOtp("");
        setStep("email");
      }
      fail(err, "Không tạo được tài khoản");
      return;
    }

    // The session cookie is set now. A logo failure must not undo a successful registration.
    setFinishing(true);
    if (logo) {
      try {
        await uploadCompanyLogo(logo);
      } catch {
        // Surfaced on the dashboard instead (Cài đặt > Thông tin công ty); nothing to block on here.
      }
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-5">
      <StepIndicator current={step} />

      {step === "email" && (
        <form onSubmit={sendOtp} className="flex w-full flex-col gap-4">
          <p className="text-sm text-gray-500">
            Nhập email của người sẽ là quản trị viên. Chúng tôi gửi mã xác minh tới địa chỉ này trước khi tạo doanh nghiệp.
          </p>
          <Input label="Email quản trị viên" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <Button type="submit" loading={requestOtp.isPending}>
            Gửi mã xác minh
          </Button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerify} className="flex w-full flex-col gap-4">
          {infoMessage && (
            <p role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-800">
              {infoMessage}
            </p>
          )}
          <Input
            label={`Mã gồm 6 chữ số gửi tới ${email}`}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
          />
          <Button type="submit" loading={verifyOtp.isPending} disabled={otp.length !== 6}>
            Xác minh
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setErrorMessage(null);
              }}
              className="text-gray-500 hover:underline"
            >
              Đổi email
            </button>
            <button
              type="button"
              onClick={sendOtp}
              disabled={cooldown > 0 || requestOtp.isPending}
              className="text-gray-500 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
            >
              {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : "Gửi lại mã"}
            </button>
          </div>
        </form>
      )}

      {step === "company" && (
        <form onSubmit={handleCompanyNext} className="flex w-full flex-col gap-4">
          <Input label="Tên doanh nghiệp" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={200} required />
          <Input
            label="Email doanh nghiệp (tuỳ chọn)"
            type="email"
            placeholder={email}
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">Logo doanh nghiệp (tuỳ chọn)</span>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-surface-muted text-xs text-gray-400">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob: preview
                  <img src={logoPreview} alt="Xem trước logo" className="h-full w-full object-cover" />
                ) : (
                  "Logo"
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <input ref={logoInputRef} type="file" accept={LOGO_ACCEPT} onChange={handlePickLogo} className="hidden" aria-label="Chọn logo" />
                <Button type="button" variant="secondary" onClick={() => logoInputRef.current?.click()}>
                  {logo ? "Đổi ảnh" : "Chọn ảnh"}
                </Button>
                {logo && (
                  <button type="button" onClick={() => setLogo(null)} className="text-left text-xs text-gray-500 hover:underline">
                    Bỏ ảnh
                  </button>
                )}
                <span className="text-xs text-gray-400">PNG, JPEG, WebP · tối đa 2MB</span>
              </div>
            </div>
          </div>
          <Button type="submit">Tiếp tục</Button>
        </form>
      )}

      {step === "account" && (
        <form onSubmit={handleRegister} className="flex w-full flex-col gap-4">
          <Input
            label="Tên đăng nhập"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            pattern="[A-Za-z0-9._\-]{3,100}"
            title="3-100 ký tự: chữ, số, dấu chấm, gạch dưới hoặc gạch ngang"
            required
          />
          <Input label="Họ tên" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" maxLength={200} required />
          <Input
            label="Mật khẩu (8-72 ký tự)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
          <Input
            label="Nhập lại mật khẩu"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep("company")}>
              Quay lại
            </Button>
            <Button type="submit" loading={registerCompany.isPending || finishing} className="flex-1">
              Tạo doanh nghiệp
            </Button>
          </div>
        </form>
      )}

      {errorMessage && (
        <p role="alert" className="w-full text-sm text-danger">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
