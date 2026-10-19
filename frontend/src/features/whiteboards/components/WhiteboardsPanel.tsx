"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { useTabs } from "@/components/layout/TabsContext";
import { AnimatedList } from "@/components/ui/AnimatedList";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/lib/i18n/useI18n";
import { useCreateWhiteboard, useWhiteboards } from "../hooks/useWhiteboards";
import { ACCESS_KEYS } from "../accessLabels";
import { whiteboardErrorMessage } from "../whiteboardErrors";

/** Boards the user owns or was shared, newest change first; each card opens the board in the current tab. */
export function WhiteboardsPanel() {
  const { t, intlLocale } = useI18n();
  const { navigateActiveTab } = useTabs();
  const { data: boards, isLoading, isError } = useWhiteboards();
  const [creating, setCreating] = useState(false);

  if (isLoading) return <Skeleton rows={3} />;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-fg">{t("whiteboards.panel.title")}</h1>
          <p className="max-w-2xl text-sm text-fg-muted">{t("whiteboards.panel.intro")}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} aria-hidden className="mr-1.5" />
          {t("whiteboards.panel.create")}
        </Button>
      </header>

      {isError ? (
        <p role="alert" className="text-sm text-danger">
          {t("whiteboards.panel.couldNotLoad")}
        </p>
      ) : (boards ?? []).length === 0 ? (
        <EmptyState title={t("whiteboards.panel.emptyTitle")} description={t("whiteboards.panel.emptyDescription")} />
      ) : (
        <AnimatedList as="div" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 [.pane-narrow_&]:lg:grid-cols-1">
          {(boards ?? []).map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => navigateActiveTab(`/dashboard/whiteboards/${board.id}`)}
              className="card-interactive flex flex-col gap-2 rounded glass-card p-4 text-left hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 font-semibold text-fg">{board.title}</span>
                <Badge tone={board.access === "OWNER" ? "info" : "neutral"}>{t(ACCESS_KEYS[board.access])}</Badge>
              </div>
              <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-fg-muted">
                {board.access !== "OWNER" && board.ownerName && (
                  <>
                    <span>{t("whiteboards.panel.sharedBy", { name: board.ownerName })}</span>
                    <span aria-hidden>·</span>
                  </>
                )}
                <span>
                  {t("whiteboards.panel.updatedAt", {
                    when: new Date(board.updatedAt).toLocaleString(intlLocale, { dateStyle: "short", timeStyle: "short" }),
                  })}
                </span>
              </span>
            </button>
          ))}
        </AnimatedList>
      )}

      {/* Credit to Excalidraw, which draws every board (MIT); kept small so it does not compete with the boards. */}
      <p className="text-xs text-fg-faint">
        {t("whiteboards.panel.credit")}{" "}
        <button
          type="button"
          onClick={() => navigateActiveTab("/dashboard/licenses")}
          className="underline-offset-2 hover:text-fg-muted hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {t("whiteboards.panel.creditLicense")}
        </button>
      </p>

      {creating && (
        <CreateWhiteboardDialog
          onCreated={(id) => navigateActiveTab(`/dashboard/whiteboards/${id}`)}
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  );
}

function CreateWhiteboardDialog({ onCreated, onClose }: { onCreated: (id: number) => void; onClose: () => void }) {
  const { t } = useI18n();
  const createWhiteboard = useCreateWhiteboard();
  const [title, setTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const board = await createWhiteboard.mutateAsync(title.trim());
      onClose();
      onCreated(board.id);
    } catch (err) {
      setErrorMessage(whiteboardErrorMessage(err, t("whiteboards.panel.couldNotCreate"), t));
    }
  }

  return (
    <Modal title={t("whiteboards.panel.create")} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label={t("whiteboards.panel.boardName")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          autoFocus
        />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={createWhiteboard.isPending} disabled={!title.trim()}>
            {t("whiteboards.panel.createAction")}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
