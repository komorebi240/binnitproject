"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useUploadCompanyBanner, useUploadCompanyLogo } from "../hooks/useOnboarding";
import { LOGO_ACCEPT, MAX_LOGO_BYTES } from "../types";

const ACCEPTED_TYPES = LOGO_ACCEPT.split(",");

const COPY = {
  logo: { label: "logo", change: "Đổi logo", add: "Tải logo lên", done: "Đã cập nhật logo" },
  banner: { label: "ảnh bìa", change: "Đổi ảnh bìa", add: "Tải ảnh bìa lên", done: "Đã cập nhật ảnh bìa" },
} as const;

interface CompanyImageButtonProps {
  kind: keyof typeof COPY;
  hasImage: boolean;
}

/** Picks an image and uploads it as the company's logo or banner (executives only - the backend enforces it too). */
export function CompanyImageButton({ kind, hasImage }: CompanyImageButtonProps) {
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
      showToast("error", `Ảnh phải là PNG, JPEG hoặc WebP`);
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      showToast("error", "Ảnh tối đa 2MB");
      return;
    }
    upload.mutate(file, {
      onSuccess: () => showToast("success", copy.done),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : `Không tải được ${copy.label}`),
    });
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={LOGO_ACCEPT} onChange={handlePick} className="hidden" aria-label={`Chọn ${copy.label} công ty`} />
      <Button variant="secondary" onClick={() => inputRef.current?.click()} loading={upload.isPending}>
        {hasImage ? copy.change : copy.add}
      </Button>
    </>
  );
}
