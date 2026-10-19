"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CloudArrowUp,
  CloudCheck,
  CloudWarning,
  CornersIn,
  CornersOut,
  PencilSimple,
  ShareNetwork,
  SignOut,
  Trash,
  Users,
} from "@phosphor-icons/react";
import { PaneContext, usePane } from "@/components/layout/PaneContext";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import type { UserProfile } from "@/features/auth/types";
import { useI18n } from "@/lib/i18n/useI18n";
import type { SyncStatus } from "../hooks/useWhiteboardSync";
import {
  useDeleteWhiteboard,
  useRemoveWhiteboardMember,
  useRenameWhiteboard,
  useWhiteboard,
} from "../hooks/useWhiteboards";
import { whiteboardErrorMessage } from "../whiteboardErrors";
import { ShareWhiteboardDialog } from "./ShareWhiteboardDialog";
import type { BoardMenuAction, ToolbarFit } from "./WhiteboardCanvas";

// Excalidraw is large and needs the browser: it is loaded only when a board is opened.
const WhiteboardCanvas = dynamic(() => import("./WhiteboardCanvas"), {
  ssr: false,
  loading: () => <Skeleton rows={6} />,
});

const STATUS_KEYS = {
  saved: "whiteboards.status.saved",
  unsaved: "whiteboards.status.unsaved",
  saving: "whiteboards.status.saving",
  error: "whiteboards.status.error",
  gone: "whiteboards.status.gone",
} as const;

const STATUS_ICONS = {
  saved: CloudCheck,
  unsaved: CloudArrowUp,
  saving: CloudArrowUp,
  error: CloudWarning,
  gone: CloudWarning,
} as const;

// Sized and coloured like Excalidraw's own toolbar buttons, through its CSS variables.
const TOOLBAR_BUTTON =
  "flex h-[var(--default-button-size)] min-w-[var(--default-button-size)] items-center justify-center gap-1.5 rounded-[var(--border-radius-lg)] px-2 text-sm text-fg-soft transition-colors duration-150 hover:bg-[var(--button-hover-bg)] hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

/** True while the element takes space on screen (its tab is the visible one). */
function useShown(element: HTMLElement | null): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!element) return;
    const measure = () =>
      setShown(element.getClientRects().length > 0 && element.getBoundingClientRect().width > 0);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return shown;
}

interface WhiteboardViewProps {
  boardId: number;
  currentUser: UserProfile;
  onBack: () => void;
  /** The board was deleted, or the user left it. */
  onGone: () => void;
}

/**
 * One board. What surrounds the drawing lives in the board's own toolbar row, to leave the most room for drawing: the
 * name, how saving is going, "expand" and sharing at its right end; going back, renaming, deleting or leaving in its
 * menu (≡). Expanded, the board covers the whole app over a dimmed background; the button or a click on the background
 * puts it back in its place.
 */
export function WhiteboardView({ boardId, currentUser, onBack, onGone }: WhiteboardViewProps) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const shown = useShown(root);
  const [expanded, setExpanded] = useState(false);
  const { data: board, isLoading, isError, error } = useWhiteboard(boardId);
  const deleteBoard = useDeleteWhiteboard(boardId);
  const leaveBoard = useRemoveWhiteboardMember(boardId);
  const [sync, setSync] = useState<{ status: SyncStatus; lastEditor: string | null }>({
    status: "saved",
    lastEditor: null,
  });
  const [dialog, setDialog] = useState<"rename" | "share" | "delete" | "leave" | null>(null);

  // Expanded, the board is no longer inside its half of a split screen, so its windows dim the whole app too.
  const pane = usePane();
  const boardPane = useMemo(
    () => (expanded && pane ? { ...pane, split: false } : pane),
    [expanded, pane],
  );

  const handleSyncChange = useCallback(
    (status: SyncStatus, lastEditor: string | null) => setSync({ status, lastEditor }),
    [],
  );

  if (isLoading) return <Skeleton rows={6} />;
  if (isError || !board) {
    return (
      <section className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm text-danger">
          {whiteboardErrorMessage(error, t("whiteboards.view.couldNotLoad"), t)}
        </p>
        <Button variant="secondary" onClick={onBack}>
          {t("whiteboards.view.backToList")}
        </Button>
      </section>
    );
  }

  const isOwner = board.access === "OWNER";
  const failed = sync.status === "error" || sync.status === "gone";
  const statusText = t(STATUS_KEYS[sync.status]);
  const statusDetail = [
    board.title,
    statusText,
    sync.lastEditor && sync.status === "saved"
      ? t("whiteboards.status.lastEditedBy", { name: sync.lastEditor })
      : null,
    board.access === "VIEWER" ? t("whiteboards.access.viewer") : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const StatusIcon = STATUS_ICONS[sync.status];
  const expandLabel = expanded ? t("whiteboards.view.collapse") : t("whiteboards.view.expand");
  const shareLabel = isOwner
    ? t("whiteboards.view.share")
    : `${t("whiteboards.view.people")} (${t("whiteboards.view.peopleCount", { count: board.members.length })})`;

  const menuActions: BoardMenuAction[] = [
    {
      label: t("whiteboards.view.backToList"),
      icon: <ArrowLeft size={16} aria-hidden />,
      onSelect: onBack,
    },
    {
      label: shareLabel,
      icon: isOwner ? <ShareNetwork size={16} aria-hidden /> : <Users size={16} aria-hidden />,
      onSelect: () => setDialog("share"),
    },
    {
      label: expandLabel,
      icon: expanded ? <CornersIn size={16} aria-hidden /> : <CornersOut size={16} aria-hidden />,
      onSelect: () => setExpanded((value) => !value),
    },
    ...(isOwner
      ? [
          {
            label: t("whiteboards.view.rename"),
            icon: <PencilSimple size={16} aria-hidden />,
            onSelect: () => setDialog("rename"),
          },
          {
            label: t("whiteboards.view.delete"),
            icon: <Trash size={16} aria-hidden />,
            onSelect: () => setDialog("delete"),
          },
        ]
      : [
          {
            label: t("whiteboards.view.leave"),
            icon: <SignOut size={16} aria-hidden />,
            onSelect: () => setDialog("leave"),
          },
        ]),
  ];

  // As much as fits beside Excalidraw's toolbar (see ToolbarFit); everything is also in the menu. The saving status is an
  // icon of fixed width, so the row does not shift on every save (its words are in the tooltip, and shown on an error).
  function renderToolbarEnd(fit: ToolbarFit) {
    return (
      <div className="flex min-w-0 items-center gap-0.5 rounded-[var(--border-radius-lg)] bg-[var(--color-surface-low)] p-0.5 shadow-[0_0_0_1px_var(--color-surface-lowest)]">
        <div className="flex min-w-0 items-center gap-1.5 px-2" title={statusDetail}>
          {fit === "name" && (
            <h1 className="max-w-[9rem] truncate text-sm font-semibold text-fg">{board!.title}</h1>
          )}
          <span
            className={`flex shrink-0 items-center gap-1 whitespace-nowrap text-xs ${failed ? "text-danger" : "text-fg-muted"}`}
            aria-live="polite"
          >
            <StatusIcon size={16} aria-hidden />
            <span className={failed ? "" : "sr-only"}>{statusText}</span>
          </span>
        </div>
        {fit !== "status" && (
          <>
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-pressed={expanded}
              aria-label={expandLabel}
              title={expandLabel}
              className={TOOLBAR_BUTTON}
            >
              {expanded ? (
                <CornersIn size={18} aria-hidden />
              ) : (
                <CornersOut size={18} aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={() => setDialog("share")}
              aria-label={shareLabel}
              title={shareLabel}
              className={TOOLBAR_BUTTON}
            >
              {isOwner ? (
                <ShareNetwork size={18} aria-hidden />
              ) : (
                <>
                  <Users size={18} aria-hidden />
                  <span className="tabular-nums">{board!.members.length}</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    );
  }

  async function handleDelete() {
    try {
      await deleteBoard.mutateAsync();
      showToast("success", t("whiteboards.view.deleted"));
      onGone();
    } catch (err) {
      showToast("error", whiteboardErrorMessage(err, t("whiteboards.view.couldNotDelete"), t));
    }
  }

  async function handleLeave() {
    try {
      await leaveBoard.mutateAsync(currentUser.userId);
      showToast("success", t("whiteboards.view.left"));
      onGone();
    } catch (err) {
      showToast("error", whiteboardErrorMessage(err, t("whiteboards.view.couldNotLeave"), t));
    }
  }

  return (
    <>
      {expanded && (
        // On the board's layer but before it in the page, so it lies under the board and over the rest of the app;
        // windows (z-40) and toasts (z-50) stay above both.
        <button
          type="button"
          aria-label={t("whiteboards.view.collapse")}
          onClick={() => setExpanded(false)}
          className="animate-fade-in fixed inset-0 z-30 cursor-default bg-black/45"
        />
      )}
      <section
        ref={setRoot}
        className={
          expanded
            ? "fixed inset-2 z-30 flex flex-col sm:inset-6"
            : "flex h-full min-h-[480px] flex-col"
        }
      >
        <PaneContext.Provider value={boardPane}>
          <div className="glass-card relative min-h-0 flex-1 overflow-hidden rounded">
            <WhiteboardCanvas
              board={board}
              shown={shown}
              onSyncChange={handleSyncChange}
              menuActions={menuActions}
              renderToolbarEnd={renderToolbarEnd}
            />
          </div>

          {dialog === "share" && (
            <ShareWhiteboardDialog
              board={board}
              currentUser={currentUser}
              onClose={() => setDialog(null)}
            />
          )}
          {dialog === "rename" && (
            <RenameDialog
              boardId={board.id}
              currentTitle={board.title}
              onClose={() => setDialog(null)}
            />
          )}
          {dialog === "delete" && (
            <ConfirmDialog
              title={t("whiteboards.view.delete")}
              message={t("whiteboards.view.deleteWarning", { name: board.title })}
              confirmLabel={t("whiteboards.view.delete")}
              danger
              loading={deleteBoard.isPending}
              onConfirm={handleDelete}
              onClose={() => setDialog(null)}
            />
          )}
          {dialog === "leave" && (
            <ConfirmDialog
              title={t("whiteboards.view.leave")}
              message={t("whiteboards.view.leaveWarning", { name: board.title })}
              confirmLabel={t("whiteboards.view.leave")}
              loading={leaveBoard.isPending}
              onConfirm={handleLeave}
              onClose={() => setDialog(null)}
            />
          )}
        </PaneContext.Provider>
      </section>
    </>
  );
}

function RenameDialog({
  boardId,
  currentTitle,
  onClose,
}: {
  boardId: number;
  currentTitle: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const renameBoard = useRenameWhiteboard(boardId);
  const [title, setTitle] = useState(currentTitle);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await renameBoard.mutateAsync(title.trim());
      onClose();
    } catch (err) {
      setErrorMessage(whiteboardErrorMessage(err, t("whiteboards.view.couldNotRename"), t));
    }
  }

  return (
    <Modal title={t("whiteboards.view.rename")} onClose={onClose} widthClassName="max-w-md">
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
          <Button
            type="submit"
            loading={renameBoard.isPending}
            disabled={!title.trim() || title.trim() === currentTitle}
          >
            {t("common.save")}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
