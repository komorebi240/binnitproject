"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { AnimatedCheck } from "@/components/ui/AnimatedCheck";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StepProgress } from "@/components/ui/StepProgress";
import { StepTransition } from "@/components/ui/StepTransition";
import { ApiRequestError } from "@/lib/api/client";
import { uploadCompanyLogo } from "../api/onboardingApi";
import { onboardingErrorMessage } from "../errors";
import { TermsAgreement } from "@/features/legal/components/TermsAgreement";
import { useCurrentTerms } from "@/features/legal/hooks/useTerms";
import {
  useRegisterCompany,
  useRequestRegistrationOtp,
  useVerifyRegistrationOtp,
} from "../hooks/useOnboarding";
import { LOGO_ACCEPT, MAX_LOGO_BYTES } from "../types";

import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useI18n } from "@/lib/i18n/useI18n";
type Step = "email" | "otp" | "company" | "account";

const STEPS: { id: Step; labelKey: TranslationKey }[] = [
  { id: "email", labelKey: "onboarding.registerWizard.email" },
  { id: "otp", labelKey: "onboarding.registerWizard.verify" },
  { id: "company", labelKey: "onboarding.registerWizard.company" },
  { id: "account", labelKey: "onboarding.registerWizard.administrator" },
];

const RESEND_COOLDOWN_SECONDS = 60;
const LOGO_TYPES = LOGO_ACCEPT.split(",");

/**
 * Four steps: verify the admin's email by OTP, describe the company (name, contact email, logo),
 * create the administrator account, then land on the dashboard where the guided tour starts. The
 * verification token only lives in this component's state - it is never put in the URL or storage.
 */
export function RegisterWizard() {
  const { t } = useI18n();
  const router = useRouter();
  const requestOtp = useRequestRegistrationOtp();
  const verifyOtp = useVerifyRegistrationOtp();
  const registerCompany = useRegisterCompany();
  const { data: terms } = useCurrentTerms();
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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
    setErrorMessage(onboardingErrorMessage(err, fallback, t));
  }

  async function sendOtp(event?: React.SyntheticEvent) {
    event?.preventDefault();
    setErrorMessage(null);
    try {
      await requestOtp.mutateAsync(email.trim());
      setInfoMessage(t("onboarding.registerWizard.aVerificationCodeHasBeenSent"));
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("otp");
    } catch (err) {
      fail(err, t("onboarding.registerWizard.couldnTSendTheVerificationCode"));
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
      fail(err, t("onboarding.registerWizard.theVerificationCodeIsIncorrect"));
    }
  }

  function handlePickLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!picked) return;
    if (!LOGO_TYPES.includes(picked.type)) {
      setErrorMessage(t("onboarding.registerWizard.theLogoMustBeAPng"));
      return;
    }
    if (picked.size > MAX_LOGO_BYTES) {
      setErrorMessage(t("onboarding.registerWizard.theLogoCanBe2mbAt"));
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
      setErrorMessage(t("onboarding.acceptInvitationForm.thePasswordsDonTMatch"));
      return;
    }
    if (!verificationToken) {
      setStep("email");
      return;
    }
    if (!terms) return;

    try {
      await registerCompany.mutateAsync({
        verificationToken,
        companyName: companyName.trim(),
        contactEmail: contactEmail.trim() || undefined,
        username: username.trim(),
        fullName: fullName.trim(),
        password,
        acceptedTermsVersion: terms.version,
      });
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "INVALID_VERIFICATION") {
        // Token expired/used: the account was NOT created, so start verification again.
        setVerificationToken(null);
        setOtp("");
        setStep("email");
      }
      fail(err, t("onboarding.acceptInvitationForm.couldnTCreateTheAccount"));
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

  if (finishing) {
    return (
      <div
        className="flex w-full flex-col items-center gap-3 py-6 text-center"
        role="status"
      >
        <AnimatedCheck label={t("onboarding.registerWizard.companyCreated")} />
        <h2 className="text-lg font-semibold text-fg">{t("onboarding.registerWizard.yourCompanyIsReady")}</h2>
        <p className="text-sm text-fg-muted">{t("onboarding.registerWizard.takingYouIntoOrbit")}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <StepProgress steps={STEPS.map(({ id, labelKey }) => ({ id, label: t(labelKey) }))} currentId={step} label={t("onboarding.registerWizard.registrationSteps")} />

      <StepTransition
        stepKey={step}
        index={STEPS.findIndex((s) => s.id === step)}
        className="w-full"
      >
        {step === "email" && (
          <form onSubmit={sendOtp} className="flex w-full flex-col gap-4">
            <p className="text-sm text-fg-muted">
              {t("onboarding.registerWizard.enterTheEmailOfThePerson")}
            </p>
            <Input
              label={t("onboarding.registerWizard.administratorEmail")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Button type="submit" loading={requestOtp.isPending}>
              {t("onboarding.registerWizard.sendVerificationCode")}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerify} className="flex w-full flex-col gap-4">
            {infoMessage && <Alert tone="success">{infoMessage}</Alert>}
            <Input
              label={t("onboarding.registerWizard.6DigitCodeSentToEmail", { email })}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
            <Button type="submit" loading={verifyOtp.isPending} disabled={otp.length !== 6}>
              {t("onboarding.registerWizard.verify")}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setErrorMessage(null);
                }}
                className="text-fg-muted hover:underline"
              >
                {t("onboarding.registerWizard.changeEmail")}
              </button>
              <button
                type="button"
                onClick={sendOtp}
                disabled={cooldown > 0 || requestOtp.isPending}
                className="text-fg-muted hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
              >
                {cooldown > 0 ? t("common.resendCodeCooldownS", { cooldown }) : t("common.resendCode")}
              </button>
            </div>
          </form>
        )}

        {step === "company" && (
          <form onSubmit={handleCompanyNext} className="flex w-full flex-col gap-4">
            <Input
              label={t("onboarding.registerWizard.companyName")}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={200}
              required
            />
            <Input
              label={t("onboarding.registerWizard.companyEmailOptional")}
              type="email"
              placeholder={email}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-fg-soft">{t("onboarding.registerWizard.companyLogoOptional")}</span>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-surface-muted text-xs text-fg-faint">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local blob: preview
                    <img
                      src={logoPreview}
                      alt={t("onboarding.registerWizard.logoPreview")}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "Logo"
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept={LOGO_ACCEPT}
                    onChange={handlePickLogo}
                    className="hidden"
                    aria-label={t("onboarding.registerWizard.chooseALogo")}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logo ? t("onboarding.registerWizard.changeImage") : t("onboarding.registerWizard.chooseAnImage")}
                  </Button>
                  {logo && (
                    <button
                      type="button"
                      onClick={() => setLogo(null)}
                      className="text-left text-xs text-fg-muted hover:underline"
                    >
                      {t("onboarding.registerWizard.removeImage")}
                    </button>
                  )}
                  <span className="text-xs text-fg-faint">{t("onboarding.companyProfileForm.pngJpegWebp2mbAtMost")}</span>
                </div>
              </div>
            </div>
            <Button type="submit">{t("common.continue")}</Button>
          </form>
        )}

        {step === "account" && (
          <form onSubmit={handleRegister} className="flex w-full flex-col gap-4">
            <Input
              label={t("common.username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              pattern="[A-Za-z0-9._\-]{3,100}"
              title={t("onboarding.acceptInvitationForm.3100CharactersLettersDigitsDots")}
              required
            />
            <Input
              label={t("common.fullName")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              maxLength={200}
              required
            />
            <Input
              label={t("onboarding.acceptInvitationForm.password872Characters")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
            <Input
              label={t("onboarding.acceptInvitationForm.reEnterThePassword")}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
            <TermsAgreement agreed={agreedToTerms} onChange={setAgreedToTerms} />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep("company")}>
                {t("onboarding.onboardingTour.back")}
              </Button>
              <Button
                type="submit"
                loading={registerCompany.isPending || finishing}
                disabled={!agreedToTerms || !terms}
                className="flex-1"
              >
                {t("onboarding.registerWizard.createCompany")}
              </Button>
            </div>
          </form>
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
