"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { ApiRequestError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { useAcceptTerms, useCurrentTerms } from "../hooks/useTerms";
import { TermsDocument } from "./TermsDocument";

/**
 * Shown instead of the app when the signed-in person has not accepted the newest terms (first sign-in after the terms were
 * published or changed). It cannot be dismissed: the only ways out are accepting or signing out. The server enforces the
 * same rule (TermsAcceptanceFilter), so this window is the explanation, not the control.
 */
export function TermsGate() {
  const { t, intlLocale } = useI18n();
  const router = useRouter();
  const { showToast } = useToast();
  const { data: terms, isLoading, isError, refetch } = useCurrentTerms();
  const accept = useAcceptTerms();
  const logout = useLogout();

  async function handleAccept() {
    if (!terms) return;
    try {
      await accept.mutateAsync(terms.version);
    } catch (err) {
      showToast("error", err instanceof ApiRequestError ? err.message : t("legal.termsGate.couldNotAccept"));
    }
  }

  async function handleSignOut() {
    await logout.mutateAsync();
    router.push("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-gate-title"
        className="glass-window flex max-h-[92vh] w-full max-w-2xl flex-col gap-4 rounded-lg p-6"
      >
        <header className="flex flex-col gap-1">
          <h1 id="terms-gate-title" className="text-lg font-semibold text-fg">
            {terms?.title ?? t("legal.termsGate.title")}
          </h1>
          <p className="text-sm text-fg-muted">{t("legal.termsGate.intro")}</p>
          {terms && (
            <p className="text-xs text-fg-faint">
              {t("legal.termsGate.version", { version: terms.version, date: new Date(terms.publishedAt).toLocaleDateString(intlLocale) })}
            </p>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto rounded border border-line bg-surface/60 p-4" tabIndex={0}>
          {isLoading && <Skeleton rows={6} />}
          {isError && (
            <p role="alert" className="text-sm text-danger">
              {t("legal.termsGate.couldNotLoad")}{" "}
              <button type="button" onClick={() => refetch()} className="underline">
                {t("legal.termsGate.retry")}
              </button>
            </p>
          )}
          {terms && <TermsDocument terms={terms} />}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleAccept} loading={accept.isPending} disabled={!terms}>
            {t("legal.termsGate.accept")}
          </Button>
          <Button type="button" variant="secondary" onClick={handleSignOut} loading={logout.isPending}>
            {t("common.signOut")}
          </Button>
        </div>
      </section>
    </main>
  );
}
