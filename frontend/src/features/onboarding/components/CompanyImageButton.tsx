"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useUploadCompanyBanner, useUploadCompanyLogo } from "../hooks/useOnboarding";
import { LOGO_ACCEPT, MAX_LOGO_BYTES } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
const ACCEPTED_TYPES = LOGO_ACCEPT.split(",");

const COPY = {
  logo: { label: "onboarding.companyImageButton.logo", change: "onboarding.companyImageButton.changeLogo", add: "onboarding.companyImageButton.uploadLogo", done: "onboarding.companyImageButton.logoUpdated" },
  banner: {
    label: "onboarding.companyImageButton.coverImage",
    change: "onboarding.companyImageButton.changeCoverImage",
    add: "onboarding.companyImageButton.uploadCoverImage",
    done: "onboarding.companyImageButton.coverImageUpdated",
  },
} as const;

interface CompanyImageButtonProps {
  kind: keyof typeof COPY;
  hasImage: boolean;
}

/** Picks an image and uploads it as the company's logo or banner (executives only - the backend enforces it too). */
export function CompanyImageButton({ kind, hasImage }: CompanyImageButtonProps) {
  const { t } = useI18n();
  const uploadLogo = useUploadCompanyLogo();
  const uploadBanner = useUploadCompanyBanner();
  const upload = kind === "logo" ? uploadLogo : uploadBanner;
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = COPY[kind];

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast("error", t("onboarding.companyImageButton.theImageMustBePngJpeg"));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      showToast("error", t("onboarding.companyImageButton.theImageCanBe2mbAt"));
      return;
    }
    upload.mutate(file, {
      onSuccess: () => showToast("success", t(copy.done)),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("onboarding.companyImageButton.couldnTUploadTheLabel", { label: t(copy.label) })),
    });
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={LOGO_ACCEPT} onChange={handlePick} className="hidden" aria-label={t("onboarding.companyImageButton.chooseTheCompanyLabel", { label: t(copy.label) })} />
      <Button variant="secondary" onClick={() => inputRef.current?.click()} loading={upload.isPending}>
        {t(hasImage ? copy.change : copy.add)}
      </Button>
    </>
  );
}
