"use client";

import { useAuthedBlobUrl } from "@/lib/hooks/useAuthedBlobUrl";

const SIZE_CLASSES = { sm: "h-7 w-7 text-xs", lg: "h-16 w-16 text-xl" } as const;

interface CompanyLogoProps {
  name: string;
  logoUrl: string | null;
  size?: keyof typeof SIZE_CLASSES;
}

/** The company's uploaded logo, or its initial on the brand gradient when none is set. */
export function CompanyLogo({ name, logoUrl, size = "sm" }: CompanyLogoProps) {
  const src = useAuthedBlobUrl(logoUrl);
  const box = `shrink-0 rounded-lg ${SIZE_CLASSES[size]}`;

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- blob: URL, next/image can't optimize it
    return <img src={src} alt="" className={`${box} object-cover`} />;
  }
  return (
    <span
      aria-hidden
      className={`gradient-surface flex items-center justify-center bg-gradient-to-r from-primary to-primaryEnd font-semibold text-primary-foreground ${box}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
