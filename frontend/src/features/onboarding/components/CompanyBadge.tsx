"use client";

import { useTabs } from "@/components/layout/TabsContext";
import { CompanyLogo } from "./CompanyLogo";
import { useCompany } from "../hooks/useOnboarding";

/** Header chip showing whose workspace this is (company logo + name); hidden on small screens. Opens the company page. */
export function CompanyBadge() {
  const { data: company } = useCompany();
  const { navigateActiveTab } = useTabs();
  if (!company) return null;

  return (
    <button
      type="button"
      onClick={() => navigateActiveTab("/dashboard/company")}
      title={`Giới thiệu ${company.name}`}
      aria-label={`Giới thiệu ${company.name}`}
      data-tour="company"
      className="ml-3 hidden min-w-0 items-center gap-2 rounded border-l border-line pl-3 text-left transition-colors duration-150 hover:text-primary-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:flex"
    >
      <CompanyLogo name={company.name} logoUrl={company.logoUrl} />
      <span className="max-w-[12rem] truncate text-sm font-medium text-fg-soft">{company.name}</span>
    </button>
  );
}
