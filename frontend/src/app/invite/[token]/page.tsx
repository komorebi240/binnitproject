"use client";

import { AuthPageShell } from "@/components/layout/AuthPageShell";
import { OrbitWordmark } from "@/components/brand/OrbitWordmark";
import { AcceptInvitationForm } from "@/features/onboarding/components/AcceptInvitationForm";
import { useParams } from "next/navigation";

import { useI18n } from "@/lib/i18n/useI18n";
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useI18n();
  return (
    <AuthPageShell>
      <div className="flex flex-col items-center gap-3 text-center">
        <OrbitWordmark width={180} />
        <div>
          <h1 className="text-xl font-semibold text-fg">{t("app.page.youReInvited")}</h1>
          <p className="text-sm text-fg-muted">{t("app.page.createAnAccountToStartWorking")}</p>
        </div>
      </div>
      <AcceptInvitationForm token={token} />
    </AuthPageShell>
  );
}
