"use client";

import { AuthWindow } from "@/components/layout/AuthWindow";
import { StepTransition } from "@/components/ui/StepTransition";
import { RegisterWizard } from "@/features/onboarding/components/RegisterWizard";
import type { AuthView } from "../authView";
import { LoginForm } from "./LoginForm";

import { useI18n } from "@/lib/i18n/useI18n";
function SwitchLink({
  prompt,
  action,
  onClick,
}: {
  prompt: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <p className="mt-6 text-center text-sm text-fg-muted">
      {prompt}{" "}
      <button
        type="button"
        onClick={onClick}
        className="font-medium text-primary-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {action}
      </button>
    </p>
  );
}

/**
 * The sign-in and registration windows of the landing page. Kept in a module of its own so the landing can load it on
 * demand (see AuthLanding): the forms and the registration wizard are not needed to show the logo and the two buttons.
 */
export function AuthWindows({
  view,
  onViewChange,
  onClose,
}: {
  view: AuthView;
  onViewChange: (view: AuthView) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <AuthWindow label={view === "login" ? t("common.signIn") : t("auth.authWindows.registerYourCompany")} onClose={onClose}>
      <StepTransition stepKey={view} index={view === "login" ? 0 : 1}>
        {view === "login" ? (
          <div>
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-fg">{t("auth.authWindows.signInToOrbit")}</h2>
              <p className="mt-1 text-sm text-fg-muted">{t("auth.authWindows.useTheAccountYourManagerGave")}</p>
            </div>
            <LoginForm onRegisterClick={() => onViewChange("register")} />
          </div>
        ) : (
          <div>
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-fg">{t("auth.authWindows.registerYourCompany")}</h2>
              <p className="mt-1 text-sm text-fg-muted">
                {t("auth.authWindows.createYourWorkspaceAndTheFirst")}
              </p>
            </div>
            <RegisterWizard />
            <SwitchLink prompt={t("auth.authWindows.alreadyHaveAnAccount")} action={t("common.signIn")} onClick={() => onViewChange("login")} />
          </div>
        )}
      </StepTransition>
    </AuthWindow>
  );
}
