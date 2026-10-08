"use client";

import { AuthPageShell } from "@/components/layout/AuthPageShell";
import { OrbitWordmark } from "@/components/brand/OrbitWordmark";
import { AcceptInvitationForm } from "@/features/onboarding/components/AcceptInvitationForm";

import { useI18n } from "@/lib/i18n/useI18n";
interface InvitePageProps {
  params: { token: string };
}

export default function InvitePage({ params }: InvitePageProps) {
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
      <AcceptInvitationForm token={params.token} />
    </AuthPageShell>
  );
}
