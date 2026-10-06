"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { UserProfile } from "@/features/auth/types";
import { useCompany } from "../hooks/useOnboarding";
import { CompanyEditDialog } from "./CompanyEditDialog";
import { CompanyImageButton } from "./CompanyImageButton";
import { CompanyLogo } from "./CompanyLogo";

/** EXECUTIVE-only - the backend independently enforces this too (CompanyController). The company page has the same actions. */
export function CompanyProfileForm({ currentUser }: { currentUser: UserProfile }) {
  const { data: company } = useCompany();
  const [editing, setEditing] = useState(false);

  if (currentUser.authorityLevel !== "EXECUTIVE") {
    return null;
  }

  return (
    <section className="flex flex-col gap-3" data-tour="company-profile">
      <h2 className="text-lg font-semibold text-fg">Thông tin công ty</h2>

      <div className="flex items-center gap-3">
        <CompanyLogo name={company?.name ?? currentUser.companyName} logoUrl={company?.logoUrl ?? null} size="lg" />
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-2">
            <CompanyImageButton kind="logo" hasImage={company?.logoUrl != null} />
            <CompanyImageButton kind="banner" hasImage={company?.bannerUrl != null} />
            {company && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Sửa thông tin
              </Button>
            )}
          </div>
          <span className="text-xs text-fg-faint">PNG, JPEG, WebP · tối đa 2MB</span>
        </div>
      </div>

      {editing && company && <CompanyEditDialog company={company} onClose={() => setEditing(false)} />}
    </section>
  );
}
