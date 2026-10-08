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

import { RichText } from "@/components/i18n/RichText";
import { useI18n } from "@/lib/i18n/useI18n";
/**
 * The manager never sees or sets a password: the staff member gets the same emailed code as "Quên mật
 * khẩu" and chooses their own. Only the people the server lets manage this user can do it.
 */
export function ResetPasswordPanel({ user }: { user: UserSummary }) {
  const { t } = useI18n();
  const sendReset = useSendStaffPasswordReset();
  const { showToast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSend() {
    setErrorMessage(null);
    sendReset.mutate(user.id, {
      onSuccess: () => showToast("success", t("organization.staffAccountPanels.passwordResetEmailSentToFullname", { fullName: user.fullName })),
      onError: (err) =>
        setErrorMessage(err instanceof ApiRequestError ? err.message : t("organization.staffAccountPanels.couldnTSendTheEmail")),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-fg-soft">
        <RichText text={t("organization.staffAccountPanels.resetPasswordIntro")} values={{ name: <strong>{user.fullName}</strong> }} />
      </p>
      {errorMessage && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}
      <div>
        <Button variant="secondary" onClick={handleSend} loading={sendReset.isPending}>
          {t("organization.staffAccountPanels.sendPasswordResetEmail")}
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
  const { t } = useI18n();
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
      { onSuccess: () => setStep("code"), onError: fail(t("organization.staffAccountPanels.couldnTSendTheConfirmationCode")) },
    );
  }

  function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    confirmChange.mutate(
      { userId: user.id, otp: code.trim() },
      {
        onSuccess: () => {
          showToast("success", t("organization.staffAccountPanels.changedFullnameSEmail", { fullName: user.fullName }));
          setStep("email");
          setEmail("");
          setCode("");
        },
        onError: fail(t("organization.staffAccountPanels.theCodeIsWrongOrHas")),
      },
    );
  }

  if (step === "email") {
    return (
      <form onSubmit={handleRequest} className="flex flex-col gap-2">
        <p className="text-sm text-fg-soft">
          <RichText text={t("organization.staffAccountPanels.changeEmailIntro")} values={{ name: <strong>{user.fullName}</strong> }} />
        </p>
        <Input
          label={t("organization.staffAccountPanels.newEmail")}
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
            {t("organization.staffAccountPanels.sendConfirmationCode")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleConfirm} className="flex flex-col gap-2">
      <p className="text-sm text-fg-soft">
        <RichText
          text={t("organization.staffAccountPanels.codeSentIntro", { name: user.fullName })}
          values={{ email: <strong>{email.trim()}</strong> }}
        />
      </p>
      <Input
        label={t("organization.staffAccountPanels.confirmationCode")}
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
          {t("organization.staffAccountPanels.confirmEmailChange")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setStep("email")}>
          {t("organization.staffAccountPanels.reEnterTheEmail")}
        </Button>
      </div>
    </form>
  );
}
