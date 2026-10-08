"use client";

import { useState } from "react";
import { FileDoc, FileXls, Plus, Scroll } from "@phosphor-icons/react";
import { useTabs } from "@/components/layout/TabsContext";
import { AnimatedList } from "@/components/ui/AnimatedList";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import type { UserProfile } from "@/features/auth/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { crmErrorMessage } from "../crmErrors";
import { useCreateDataset, useDatasets, useDownloadTemplate } from "../hooks/useCrm";
import { SOURCE_TYPE_KEYS } from "../types";
import { AuditLogDialog } from "./AuditLogDialog";
import { DatasetFormDialog } from "./DatasetFormDialog";

/**
 * The customer data of the company, grouped by where it came from: one card per dataset (a Facebook list, an event, an
 * Excel sheet...). Executives and department heads create datasets and download the import templates; everyone sees the
 * datasets of their own department.
 */
export function CrmPanel({ currentUser }: { currentUser: UserProfile }) {
  const { t, intlLocale } = useI18n();
  const { showToast } = useToast();
  const { navigateActiveTab } = useTabs();
  const { data: datasets, isLoading } = useDatasets();
  const createDataset = useCreateDataset();
  const downloadTemplate = useDownloadTemplate();
  const [creating, setCreating] = useState(false);
  const [showingAudit, setShowingAudit] = useState(false);

  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";
  const canCreate = isExecutive || currentUser.authorityLevel === "DEPARTMENT_HEAD";

  async function handleTemplate(kind: "xlsx" | "docx") {
    try {
      await downloadTemplate.mutateAsync(kind);
    } catch (err) {
      showToast("error", crmErrorMessage(err, t("crm.template.couldNotDownload"), t));
    }
  }

  if (isLoading) {
    return <Skeleton rows={3} />;
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-fg">{t("crm.panel.title")}</h1>
          <p className="max-w-2xl text-sm text-fg-muted">{t("crm.panel.intro")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <>
              <Button variant="secondary" onClick={() => handleTemplate("xlsx")} loading={downloadTemplate.isPending}>
                <FileXls size={16} aria-hidden className="mr-1.5" />
                {t("crm.template.excel")}
              </Button>
              <Button variant="secondary" onClick={() => handleTemplate("docx")} loading={downloadTemplate.isPending}>
                <FileDoc size={16} aria-hidden className="mr-1.5" />
                {t("crm.template.word")}
              </Button>
            </>
          )}
          {isExecutive && (
            <Button variant="secondary" onClick={() => setShowingAudit(true)}>
              <Scroll size={16} aria-hidden className="mr-1.5" />
              {t("crm.audit.open")}
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden className="mr-1.5" />
              {t("crm.dataset.create")}
            </Button>
          )}
        </div>
      </header>

      {(datasets ?? []).length === 0 ? (
        <EmptyState
          title={t("crm.panel.emptyTitle")}
          description={canCreate ? t("crm.panel.emptyCanCreate") : t("crm.panel.emptyReadOnly")}
        />
      ) : (
        <AnimatedList as="div" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 [.pane-narrow_&]:lg:grid-cols-1">
          {(datasets ?? []).map((dataset) => (
            <button
              key={dataset.id}
              type="button"
              onClick={() => navigateActiveTab(`/dashboard/crm/${dataset.id}`)}
              className="card-interactive flex flex-col gap-2 rounded glass-card p-4 text-left hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 font-semibold text-fg">{dataset.name}</span>
                <Badge tone="info">{t(SOURCE_TYPE_KEYS[dataset.sourceType])}</Badge>
              </div>
              {dataset.description && <span className="line-clamp-2 text-sm text-fg-soft">{dataset.description}</span>}
              <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-fg-muted">
                <span>{t("crm.dataset.rowCount", { count: dataset.rowCount })}</span>
                <span aria-hidden>·</span>
                <span>{dataset.departmentName ?? t("crm.dataset.executivesOnly")}</span>
                <span aria-hidden>·</span>
                <span>{new Date(dataset.createdAt).toLocaleDateString(intlLocale)}</span>
              </span>
            </button>
          ))}
        </AnimatedList>
      )}

      {creating && (
        <DatasetFormDialog
          currentUser={currentUser}
          saving={createDataset.isPending}
          onSave={async (input) => {
            const created = await createDataset.mutateAsync(input);
            navigateActiveTab(`/dashboard/crm/${created.dataset.id}`);
          }}
          onClose={() => setCreating(false)}
        />
      )}
      {showingAudit && <AuditLogDialog onClose={() => setShowingAudit(false)} />}
    </section>
  );
}
