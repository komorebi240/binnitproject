"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, DotsSixVertical, MagnifyingGlass, NotePencil, PaperPlaneRight, X } from "@phosphor-icons/react";
import { useTabs } from "@/components/layout/TabsContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import type { UserProfile } from "@/features/auth/types";
import { CreateOwnEventDialog } from "@/features/calendar/components/CreateOwnEventDialog";
import { useCreateNote } from "@/features/notes/hooks/useNotes";
import { CreateOwnTaskForm } from "@/features/tasks/components/CreateOwnTaskForm";
import { useWhiteboards } from "@/features/whiteboards/hooks/useWhiteboards";
import { SNIPPET_MIME, queueSnippet } from "@/features/whiteboards/snippetTransfer";
import { canEdit } from "@/features/whiteboards/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { analyzeText, titleFromText } from "../analyzeText";
import { IGNORE_ATTRIBUTE, MAX_CAPTURE_LENGTH, type Box } from "../textCapture";
import { AnalysisView } from "./AnalysisView";

const PANEL_WIDTH = 380;
/** About how tall the panel is with its three actions; used only to keep it inside the window. */
const PANEL_HEIGHT = 420;
const GAP = 8;
const EDGE = 16;
/** Calendar events keep at most this much of the text as their description (the server's column size). */
const EVENT_DESCRIPTION_MAX = 1_000;
const TITLE_MAX = 200;

type View = "actions" | "analysis" | "boards";

interface SmartSelectPanelProps {
  text: string;
  /** Where the text was on screen; the panel opens beside it. */
  area: Box;
  currentUser: UserProfile;
  onClose: () => void;
}

/**
 * Beside the selection when there is room (right, then left); otherwise under it, or above it near the bottom of the
 * window - so it does not cover what was just selected. Always inside the window.
 */
function panelStyle(area: Box): React.CSSProperties {
  const width = Math.min(PANEL_WIDTH, window.innerWidth - EDGE * 2);
  const clampTop = (top: number) => Math.min(Math.max(top, EDGE), Math.max(EDGE, window.innerHeight - EDGE - PANEL_HEIGHT));
  if (area.right + GAP + width <= window.innerWidth - EDGE) return { left: area.right + GAP, top: clampTop(area.top), width };
  if (area.left - GAP - width >= EDGE) return { left: area.left - GAP - width, top: clampTop(area.top), width };
  const left = Math.min(Math.max(area.left, EDGE), window.innerWidth - EDGE - width);
  const below = area.bottom + GAP;
  const top = below + PANEL_HEIGHT <= window.innerHeight - EDGE ? below : clampTop(area.top - GAP - PANEL_HEIGHT);
  return { left, top, width };
}

/**
 * What to do with the captured text: 1 copy it, 2 analyse it (dates, contacts, amounts... with "create a task" and "add
 * an event" pre-filled from it), 3 put it on a whiteboard - drag the handle onto a board open beside (split screen), or
 * pick a board to send it to - 4 save it as a new note. The text can be corrected first; every action uses what is in
 * the box. Text read from a whiteboard comes out the same way, which is how it gets back out of a board.
 */
export function SmartSelectPanel({ text: capturedText, area, currentUser, onClose }: SmartSelectPanelProps) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { openNewTab, navigateActiveTab } = useTabs();
  const [text, setText] = useState(capturedText);
  const [view, setView] = useState<View>("actions");
  const [dialog, setDialog] = useState<"task" | "event" | null>(null);
  // While the text is being dragged the panel fades and lets the drop through to a board it may be covering.
  const [dragging, setDragging] = useState(false);
  const analysis = useMemo(() => (view === "analysis" ? analyzeText(text, new Date()) : null), [text, view]);
  const style = useMemo(() => panelStyle(area), [area]);
  const createNote = useCreateNote();

  useEffect(() => {
    if (dialog) return undefined;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      // 1 to 4 pick an action, unless the user is typing in the text box.
      if (view !== "actions" || !text.trim() || (event.target as HTMLElement | null)?.closest("textarea, input")) return;
      if (event.key === "1") void copy();
      else if (event.key === "2") setView("analysis");
      else if (event.key === "3") setView("boards");
      else if (event.key === "4") void saveAsNote();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  async function copy(value = text) {
    try {
      await navigator.clipboard.writeText(value);
      showToast("success", t("smartSelect.panel.copied"));
    } catch {
      showToast("error", t("smartSelect.panel.couldNotCopy"));
    }
  }

  async function saveAsNote() {
    if (createNote.isPending) return;
    try {
      await createNote.mutateAsync({ title: titleFromText(text, TITLE_MAX), content: text });
      showToast("success", t("smartSelect.panel.savedAsNote"));
      onClose();
    } catch {
      showToast("error", t("smartSelect.panel.couldNotSaveNote"));
    }
  }

  function sendToBoard(boardId: number) {
    queueSnippet(boardId, text);
    openNewTab();
    navigateActiveTab(`/dashboard/whiteboards/${boardId}`);
    onClose();
  }

  if (dialog === "task" && analysis) {
    return (
      <Modal title={t("common.addTask")} onClose={onClose}>
        <CreateOwnTaskForm
          currentUser={currentUser}
          onDone={onClose}
          initial={{
            title: analysis.suggestion.title.slice(0, TITLE_MAX),
            description: text,
            dueDate: analysis.suggestion.date ?? undefined,
          }}
        />
      </Modal>
    );
  }
  if (dialog === "event" && analysis) {
    const { date, time, title } = analysis.suggestion;
    return (
      <CreateOwnEventDialog
        onClose={onClose}
        initial={{
          title: title.slice(0, TITLE_MAX),
          startAt: date ? `${date}T${time ?? "09:00"}` : "",
          description: text.slice(0, EVENT_DESCRIPTION_MAX),
        }}
      />
    );
  }

  return (
    <div
      {...{ [IGNORE_ATTRIBUTE]: "" }}
      role="dialog"
      aria-label={t("smartSelect.panel.title")}
      style={style}
      className={`glass-window animate-fade-in fixed z-50 flex max-h-[calc(100vh-2rem)] flex-col gap-3 overflow-y-auto rounded-lg p-4 transition-opacity duration-150 max-sm:!inset-x-2 max-sm:!bottom-2 max-sm:!top-auto max-sm:!w-auto ${
        dragging ? "pointer-events-none opacity-40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {view !== "actions" && (
            <button
              type="button"
              onClick={() => setView("actions")}
              aria-label={t("smartSelect.panel.back")}
              className="flex h-8 w-8 items-center justify-center rounded text-fg-soft hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ArrowLeft size={16} aria-hidden />
            </button>
          )}
          <h2 className="text-sm font-semibold text-fg">
            {view === "analysis" ? t("smartSelect.analysis.title") : view === "boards" ? t("smartSelect.boards.title") : t("smartSelect.panel.title")}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="flex h-8 w-8 items-center justify-center rounded text-fg-faint hover:bg-surface-muted hover:text-fg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      {view === "actions" && (
        <>
          <Textarea
            label={t("smartSelect.panel.capturedText")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={MAX_CAPTURE_LENGTH}
          />
          <div className="grid grid-cols-1 gap-2">
            <ActionButton number={1} icon={<Copy size={16} aria-hidden />} label={t("smartSelect.panel.copy")} onClick={() => copy()} disabled={!text.trim()} />
            <ActionButton
              number={2}
              icon={<MagnifyingGlass size={16} aria-hidden />}
              label={t("smartSelect.panel.analyze")}
              onClick={() => setView("analysis")}
              disabled={!text.trim()}
            />
            <ActionButton
              number={3}
              icon={<PaperPlaneRight size={16} aria-hidden />}
              label={t("smartSelect.panel.toBoard")}
              onClick={() => setView("boards")}
              disabled={!text.trim()}
            />
            <ActionButton
              number={4}
              icon={<NotePencil size={16} aria-hidden />}
              label={t("smartSelect.panel.saveAsNote")}
              onClick={() => saveAsNote()}
              disabled={!text.trim() || createNote.isPending}
            />
          </div>
          <DragHandle text={text} onDragChange={setDragging} onDropped={onClose} />
        </>
      )}

      {view === "analysis" && analysis && (
        <AnalysisView analysis={analysis} onCopy={(value) => copy(value)} onCreateTask={() => setDialog("task")} onCreateEvent={() => setDialog("event")} />
      )}

      {view === "boards" && (
        <>
          <DragHandle text={text} onDragChange={setDragging} onDropped={onClose} />
          <BoardChooser onChoose={sendToBoard} onOpenList={() => {
            openNewTab();
            navigateActiveTab("/dashboard/whiteboards");
            onClose();
          }} />
        </>
      )}
    </div>
  );
}

function ActionButton({
  number,
  icon,
  label,
  onClick,
  disabled,
}: {
  number: number;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="glass-control flex items-center gap-3 rounded px-3 py-2 text-left text-sm text-fg transition-colors duration-150 hover:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      <kbd className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line bg-surface text-xs font-semibold text-fg-soft">
        {number}
      </kbd>
      {icon}
      <span>{label}</span>
    </button>
  );
}

/** Dragged onto a board on screen, the text lands where it is dropped (WhiteboardCanvas reads SNIPPET_MIME). */
function DragHandle({
  text,
  onDragChange,
  onDropped,
}: {
  text: string;
  onDragChange: (dragging: boolean) => void;
  onDropped: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      draggable={text.trim().length > 0}
      onDragStart={(event) => {
        event.dataTransfer.setData(SNIPPET_MIME, text);
        event.dataTransfer.setData("text/plain", text);
        event.dataTransfer.effectAllowed = "copy";
        // After the browser has taken its drag image: changing the source's styles inside dragstart cancels the drag.
        setTimeout(() => onDragChange(true), 0);
      }}
      onDragEnd={(event) => {
        onDragChange(false);
        if (event.dataTransfer.dropEffect !== "none") onDropped();
      }}
      className="flex cursor-grab items-center gap-2 rounded border border-dashed border-primary/60 bg-primary/5 px-3 py-2 text-sm text-fg active:cursor-grabbing"
    >
      <DotsSixVertical size={18} aria-hidden className="shrink-0 text-primary" />
      <span className="min-w-0">
        <span className="block font-medium">{t("smartSelect.drag.title")}</span>
        <span className="block text-xs text-fg-muted">{t("smartSelect.drag.hint")}</span>
      </span>
    </div>
  );
}

function BoardChooser({ onChoose, onOpenList }: { onChoose: (boardId: number) => void; onOpenList: () => void }) {
  const { t } = useI18n();
  const { data: boards, isLoading, isError } = useWhiteboards();
  const editable = (boards ?? []).filter((board) => canEdit(board.access));

  if (isLoading) return <p className="text-sm text-fg-muted">{t("smartSelect.boards.loading")}</p>;
  if (isError) return <p role="alert" className="text-sm text-danger">{t("whiteboards.panel.couldNotLoad")}</p>;
  if (editable.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-fg-muted">{t("smartSelect.boards.none")}</p>
        <Button variant="secondary" onClick={onOpenList}>
          {t("whiteboards.panel.create")}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-fg-muted">{t("smartSelect.boards.pick")}</p>
      <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
        {editable.map((board) => (
          <li key={board.id}>
            <button
              type="button"
              onClick={() => onChoose(board.id)}
              className="w-full truncate rounded px-3 py-2 text-left text-sm text-fg hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {board.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
