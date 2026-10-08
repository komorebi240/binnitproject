"use client";

import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { useTour } from "@/features/onboarding/components/OnboardingTour";
import { CompanyProfileForm } from "@/features/onboarding/components/CompanyProfileForm";
import { KpiConfigForm } from "@/features/kpi/components/KpiConfigForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ProfileAvatarForm } from "./ProfileAvatarForm";
import { RecoveryEmailForm } from "./RecoveryEmailForm";
import { ThemePicker } from "./ThemePicker";

import { RichText } from "@/components/i18n/RichText";
import { useI18n } from "@/lib/i18n/useI18n";
interface SettingsViewProps {
  onOpenDrive: () => void;
}

/** Extracted from the old app/dashboard/settings/page.tsx so TabContentRenderer can render it
 * per-tab; the Drive link is a callback now (tab navigation) rather than a real <Link>. */
export function SettingsView({ onOpenDrive }: SettingsViewProps) {
  const { t } = useI18n();
  const { data: currentUser } = useCurrentUser();
  const { startTour } = useTour();
  if (!currentUser) return null;

  return (
    <div className="flex flex-col gap-8 divide-y divide-line/60">
      <ProfileAvatarForm currentUser={currentUser} />
      <div className="pt-8">
        <ThemePicker />
      </div>
      <div className="pt-8">
        <ChangePasswordForm />
      </div>
      <div className="pt-8">
        <RecoveryEmailForm currentUser={currentUser} />
      </div>
      <div className="pt-8">
        <CompanyProfileForm currentUser={currentUser} />
      </div>
      <div className="pt-8">
        <KpiConfigForm currentUser={currentUser} />
      </div>
      <div className="pt-8">
        <h2 className="mb-2 text-lg font-semibold text-fg">{t("settings.settingsView.userGuide")}</h2>
        <p className="mb-3 text-sm text-fg-muted">{t("settings.settingsView.watchTheTourOfOrbitS")}</p>
        <Button variant="secondary" onClick={startTour}>
          {t("settings.settingsView.watchTheGuideAgain")}
        </Button>
      </div>
      <div className="pt-8">
        <h2 className="mb-2 text-lg font-semibold text-fg">Google Drive</h2>
        <p className="text-sm text-fg-muted">
          <RichText
            text={t("settings.settingsView.manageDriveIntro")}
            values={{
              link: (
                <button type="button" onClick={onOpenDrive} className="text-primary-text hover:underline">
                  {t("settings.settingsView.googleDrivePage")}
                </button>
              ),
            }}
          />
        </p>
      </div>
    </div>
  );
}
