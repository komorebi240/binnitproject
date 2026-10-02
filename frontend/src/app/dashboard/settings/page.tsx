"use client";

import Link from "next/link";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { ThemePicker } from "@/features/settings/components/ThemePicker";
import { ProfileAvatarForm } from "@/features/settings/components/ProfileAvatarForm";
import { ChangePasswordForm } from "@/features/settings/components/ChangePasswordForm";
import { RecoveryEmailForm } from "@/features/settings/components/RecoveryEmailForm";
import { CompanyInfoForm } from "@/features/settings/components/CompanyInfoForm";
import { KpiConfigForm } from "@/features/kpi/components/KpiConfigForm";

export default function SettingsPage() {
  const { data: currentUser } = useCurrentUser();
  if (!currentUser) return null;

  return (
    <div className="flex flex-col gap-8 divide-y divide-gray-100">
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
        <CompanyInfoForm currentUser={currentUser} />
      </div>
      <div className="pt-8">
        <KpiConfigForm currentUser={currentUser} />
      </div>
      <div className="pt-8">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Google Drive</h2>
        <p className="text-sm text-gray-500">
          Quản lý kết nối và danh mục folder ở{" "}
          <Link href="/dashboard/drive" className="text-primary hover:underline">
            trang Google Drive
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
