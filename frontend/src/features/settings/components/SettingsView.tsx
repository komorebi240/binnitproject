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

interface SettingsViewProps {
  onOpenDrive: () => void;
}

/** Extracted from the old app/dashboard/settings/page.tsx so TabContentRenderer can render it
 * per-tab; the Drive link is a callback now (tab navigation) rather than a real <Link>. */
export function SettingsView({ onOpenDrive }: SettingsViewProps) {
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
        <h2 className="mb-2 text-lg font-semibold text-fg">Hướng dẫn sử dụng</h2>
        <p className="mb-3 text-sm text-fg-muted">Xem lại vòng làm quen với các tính năng chính của Orbit.</p>
        <Button variant="secondary" onClick={startTour}>
          Xem lại hướng dẫn
        </Button>
      </div>
      <div className="pt-8">
        <h2 className="mb-2 text-lg font-semibold text-fg">Google Drive</h2>
        <p className="text-sm text-fg-muted">
          Quản lý kết nối và danh mục folder ở{" "}
          <button type="button" onClick={onOpenDrive} className="text-primary-text hover:underline">
            trang Google Drive
          </button>
          .
        </p>
      </div>
    </div>
  );
}
