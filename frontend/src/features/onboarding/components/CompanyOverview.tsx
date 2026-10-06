"use client";

import { useState } from "react";
import { Envelope } from "@phosphor-icons/react";
import { useTabs } from "@/components/layout/TabsContext";
import { Button } from "@/components/ui/Button";
import { AnimatedList } from "@/components/ui/AnimatedList";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthedBlobUrl } from "@/lib/hooks/useAuthedBlobUrl";
import type { UserProfile } from "@/features/auth/types";
import { DepartmentAvatar } from "@/features/organization/departmentAppearance";
import { useDepartments } from "@/features/organization/hooks/useOrganization";
import { useCompany } from "../hooks/useOnboarding";
import { CompanyEditDialog } from "./CompanyEditDialog";
import { CompanyImageButton } from "./CompanyImageButton";
import { CompanyLogo } from "./CompanyLogo";

/**
 * The company's own page, opened from the company badge in the header: banner, logo, introduction and the
 * departments. Every member sees the same page; an executive also gets quick settings (edit the text, change
 * the logo and banner, jump to department management).
 */
export function CompanyOverview({ currentUser }: { currentUser: UserProfile }) {
  const { data: company, isLoading } = useCompany();
  const { data: departments, isLoading: departmentsLoading } = useDepartments();
  const { navigateActiveTab } = useTabs();
  const banner = useAuthedBlobUrl(company?.bannerUrl ?? null);
  const [editing, setEditing] = useState(false);
  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";

  if (isLoading || !company) {
    return <Skeleton rows={4} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-lg glass-card">
        <div className="gradient-surface h-32 bg-gradient-to-r from-primary to-primaryEnd sm:h-44">
          {banner && (
            // eslint-disable-next-line @next/next/no-img-element -- blob: URL, next/image can't optimize it
            <img src={banner} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-3 p-5">
          <div className="-mt-12 flex items-end gap-3">
            <div className="rounded-xl bg-surface p-1 shadow-sm">
              <CompanyLogo name={company.name} logoUrl={company.logoUrl} size="lg" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-fg">{company.name}</h1>
            {company.contactEmail && (
              <a
                href={`mailto:${company.contactEmail}`}
                className="inline-flex w-fit items-center gap-1.5 text-sm text-fg-muted hover:text-primary-text hover:underline"
              >
                <Envelope size={14} aria-hidden />
                {company.contactEmail}
              </a>
            )}
          </div>
          <p className="max-w-3xl whitespace-pre-wrap break-words text-sm text-fg-soft">
            {company.description ?? (isExecutive ? "Chưa có phần giới thiệu. Bấm \"Sửa thông tin\" để thêm." : "Công ty chưa có phần giới thiệu.")}
          </p>

          {isExecutive && (
            <div className="flex flex-wrap gap-2 border-t border-line/60 pt-3" aria-label="Cài đặt nhanh">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Sửa thông tin
              </Button>
              <CompanyImageButton kind="logo" hasImage={company.logoUrl !== null} />
              <CompanyImageButton kind="banner" hasImage={company.bannerUrl !== null} />
              <Button variant="secondary" onClick={() => navigateActiveTab("/dashboard/departments")}>
                Quản lý phòng ban
              </Button>
              <Button variant="secondary" onClick={() => navigateActiveTab("/dashboard/settings")}>
                Cài đặt
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg">
          Phòng ban{departments ? ` (${departments.length})` : ""}
        </h2>
        {departmentsLoading ? (
          <Skeleton rows={2} />
        ) : (departments ?? []).length === 0 ? (
          <EmptyState title="Công ty chưa có phòng ban nào" />
        ) : (
          <AnimatedList className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
            {(departments ?? []).map((department) => (
              <li key={department.id}>
                <button
                  type="button"
                  onClick={() => navigateActiveTab(`/dashboard/departments/${department.id}`)}
                  className="flex h-full w-full items-start gap-3 rounded-lg glass-card p-4 text-left transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <DepartmentAvatar department={department} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-fg">{department.name}</span>
                    <span className="mt-0.5 line-clamp-3 text-sm text-fg-muted">{department.description ?? "Chưa có mô tả."}</span>
                  </span>
                </button>
              </li>
            ))}
          </AnimatedList>
        )}
      </section>

      {editing && <CompanyEditDialog company={company} onClose={() => setEditing(false)} />}
    </div>
  );
}
