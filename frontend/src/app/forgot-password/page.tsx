"use client";

import Link from "next/link";
import { OrbitWordmark } from "@/components/brand/OrbitWordmark";
import { Tagline } from "@/components/brand/Tagline";
import { AuthCard } from "@/components/layout/AuthCard";
import { AuthPageShell } from "@/components/layout/AuthPageShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

import { useI18n } from "@/lib/i18n/useI18n";
export default function ForgotPasswordPage() {
  const { t } = useI18n();
  return (
    <AuthPageShell>
      <div className="flex flex-col items-center gap-2">
        <OrbitWordmark width={180} />
        <Tagline />
      </div>
      <AuthCard>
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-fg">{t("app.page.forgotPassword")}</h1>
          <p className="mt-1 text-sm text-fg-muted">{t("app.page.enterYourUsernameOrEmailTo")}</p>
        </div>
        <ForgotPasswordForm />
      </AuthCard>
      <Link href="/login?open=login" className="text-sm text-fg-muted hover:text-fg hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        {t("app.page.backToSignIn")}
      </Link>
    </AuthPageShell>
  );
}
