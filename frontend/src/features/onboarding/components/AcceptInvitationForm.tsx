"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { onboardingErrorMessage } from "../errors";
import { TermsAgreement } from "@/features/legal/components/TermsAgreement";
import { useCurrentTerms } from "@/features/legal/hooks/useTerms";
import { useCurrentUser, useLogout } from "@/features/auth/hooks/useAuth";
import { useAcceptInvitation, useInvitationPreview } from "../hooks/useOnboarding";
import { LEVEL_LABEL_KEYS } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
/**
 * Invitee side of an email invitation. The company, role and email come from the invitation (shown
 * read-only); the person only chooses a username, their name and a password. An invalid, used,
 * revoked or expired link all look the same on purpose (the backend answers them identically).
 */
export function AcceptInvitationForm({ token }: { token: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { data: preview, isLoading, isError } = useInvitationPreview(token);
  const acceptInvitation = useAcceptInvitation(token);
  const { data: currentUser } = useCurrentUser();
  const logout = useLogout();
  const { data: terms } = useCurrentTerms();
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isLoading) {
    return <Skeleton rows={3} />;
  }

  // Accepting would replace the session of whoever is signed in here, so ask them to sign out first.
  if (currentUser) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <p className="text-sm text-fg-soft">
          {t("onboarding.acceptInvitationForm.youReSignedInAs")} <strong>{currentUser.fullName}</strong> ({currentUser.companyName}).
        </p>
        <p className="text-sm text-fg-muted">{t("onboarding.acceptInvitationForm.signOutToCreateANew")}</p>
        <Button loading={logout.isPending} onClick={() => logout.mutate(undefined, { onSuccess: () => window.location.reload() })}>
          {t("onboarding.acceptInvitationForm.signOutAndContinue")}
        </Button>
      </div>
    );
  }

  if (isError || !preview) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <p role="alert" className="text-sm text-danger">
          {t("onboarding.acceptInvitationForm.thisInvitationIsInvalidOrHas")}
        </p>
        <p className="text-sm text-fg-muted">{t("onboarding.acceptInvitationForm.askThePersonWhoInvitedYou")}</p>
        <Link href="/login" className="text-sm text-primary-text hover:underline">
          {t("onboarding.acceptInvitationForm.goToTheSignInPage")}
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    if (password !== confirmPassword) {
      setErrorMessage(t("onboarding.acceptInvitationForm.thePasswordsDonTMatch"));
      return;
    }
    if (!terms) return;
    try {
      await acceptInvitation.mutateAsync({ username: username.trim(), fullName: fullName.trim(), password, acceptedTermsVersion: terms.version });
      router.push("/dashboard");
    } catch (err) {
      setErrorMessage(onboardingErrorMessage(err, t("onboarding.acceptInvitationForm.couldnTCreateTheAccount"), t));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="rounded-lg glass-card p-3 text-sm">
        <p className="text-fg-muted">
          <span className="font-medium text-fg">{preview.inviterName}</span> {t("onboarding.acceptInvitationForm.invitesYouToJoin")}
        </p>
        <p className="mt-0.5 text-base font-semibold text-fg">{preview.companyName}</p>
        <p className="mt-1 text-fg-muted">{t("onboarding.acceptInvitationForm.role")} {t(LEVEL_LABEL_KEYS[preview.authorityLevel])}</p>
      </div>
      <Input label="Email" type="email" value={preview.email} readOnly disabled />
      <Input
        label={t("common.username")}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        pattern="[A-Za-z0-9._\-]{3,100}"
        title={t("onboarding.acceptInvitationForm.3100CharactersLettersDigitsDots")}
        required
      />
      <Input label={t("common.fullName")} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" maxLength={200} required />
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
      {errorMessage && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}
      <TermsAgreement agreed={agreedToTerms} onChange={setAgreedToTerms} />
      <Button type="submit" loading={acceptInvitation.isPending} disabled={!agreedToTerms || !terms}>
        {t("onboarding.acceptInvitationForm.createAccountAndEnterOrbit")}
      </Button>
    </form>
  );
}
