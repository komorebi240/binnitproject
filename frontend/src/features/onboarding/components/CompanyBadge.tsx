"use client";

import { CompanyLogo } from "./CompanyLogo";
import { useCompany } from "../hooks/useOnboarding";

/** Header chip showing whose workspace this is (company logo + name); hidden on small screens. */
export function CompanyBadge() {
  const { data: company } = useCompany();
  if (!company) return null;

  return (
    <div className="ml-3 hidden min-w-0 items-center gap-2 border-l border-gray-200 pl-3 md:flex" title={company.name}>
      <CompanyLogo name={company.name} logoUrl={company.logoUrl} />
      <span className="max-w-[12rem] truncate text-sm font-medium text-gray-700">{company.name}</span>
    </div>
  );
}
