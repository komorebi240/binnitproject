"use client";

import { useRef, useState } from "react";
import { DownloadSimple, Eye, File as FileIcon, GoogleDriveLogo, Paperclip, X } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useTabs } from "@/components/layout/TabsContext";
import { ApiRequestError } from "@/lib/api/client";
import { useAuthedBlobUrl } from "@/lib/hooks/useAuthedBlobUrl";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { previewKind } from "@/features/fileViewer/fileSources";
import { useOpenFile } from "@/features/fileViewer/hooks/useOpenFile";
import { downloadTaskAttachment } from "../api/taskApi";
import { TaskChecklist } from "./TaskChecklist";
import { useAddTaskAttachment, useRemoveTaskAttachment, useTasksList, useUpdateTaskDriveUrl } from "../hooks/useTasks";
import {
  MAX_TASK_ATTACHMENTS,
  MAX_TASK_ATTACHMENT_BYTES,
  TASK_ATTACHMENT_ACCEPT,
  TASK_PRIORITY_KEYS,
  TASK_STATUS_KEYS,
  type TaskAttachment,
  type TaskPriority,
  type TaskStatus,
} from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
const STATUS_TONE: Record<TaskStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  ASSIGNED: "info",
  ACCEPTED: "warning",
  DECLINED: "danger",
  DONE: "success",
  CANCELLED: "neutral",
};

const PRIORITY_TONE: Record<TaskPriority, "neutral" | "warning" | "danger"> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "danger",
};

const DRIVE_LINK_PATTERN = /^https:\/\/(drive|docs)\.google\.com\//i;

function formatDate(value: string | null, locale: string): string {
  return value ? new Date(value).toLocaleDateString(locale) : "-";
}

function formatDateTime(value: string | null, locale: string): string {
  return value ? new Date(value).toLocaleString(locale) : "-";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PersonRow({
  label,
  name,
  userId,
  currentUserId,
  onMessage,
}: {
  label: string;
  name: string;
  userId: number | null;
  currentUserId: number;
  onMessage: (userId: number, name: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 rounded border border-line px-3 py-2">
      <Avatar avatarUrl={null} fullName={name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-fg-muted">{label}</p>
        <p className="truncate text-sm font-medium text-fg">{name}</p>
      </div>
      {userId != null && userId !== currentUserId && (
        <Button variant="secondary" onClick={() => onMessage(userId, name)}>
          {t("common.message")}
        </Button>
      )}
    </div>
  );
}

function AttachmentThumb({ taskId, attachment }: { taskId: number; attachment: TaskAttachment }) {
  // Hooks can't be conditional, so images get their own component and non-images an icon.
  const src = useAuthedBlobUrl(`/tasks/${taskId}/attachments/${attachment.id}`);
  if (!src) return <div className="h-9 w-9 shrink-0 animate-pulse rounded bg-surface-muted" aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element -- blob: URL, next/image can't optimize it
  return <img src={src} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />;
}

function AttachmentRow({
  taskId,
  attachment,
  canRemove,
  removing,
  onRemove,
}: {
  taskId: number;
  attachment: TaskAttachment;
  canRemove: boolean;
  removing: boolean;
  onRemove: (attachment: TaskAttachment) => void;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const openFile = useOpenFile();
  const viewable = !attachment.image && previewKind(attachment.fileName, attachment.contentType) !== null;

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await downloadTaskAttachment(taskId, attachment.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("error", t("common.couldnTLoadTheFile"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <li className="flex items-center gap-2 rounded border border-line px-2.5 py-1.5">
      {attachment.image ? (
        <AttachmentThumb taskId={taskId} attachment={attachment} />
      ) : (
        <FileIcon size={22} aria-hidden className="shrink-0 text-primary-text" />
      )}
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        title={t("tasks.taskDetailModal.download")}
        className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
      >
        <span className="block truncate text-sm font-medium text-fg">{attachment.fileName}</span>
        <span className="block text-xs text-fg-muted">{formatSize(attachment.sizeBytes)}</span>
      </button>
      <DownloadSimple size={16} aria-hidden className="shrink-0 text-fg-faint" />
      {viewable && (
        <button
          type="button"
          onClick={() => openFile({ kind: "task", taskId, attachmentId: attachment.id }, attachment.fileName)}
          aria-label={t("tasks.taskDetailModal.openFileFilename", { fileName: attachment.fileName })}
          title={t("tasks.taskDetailModal.openInTab")}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-fg-faint hover:bg-surface-muted hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Eye size={14} aria-hidden />
        </button>
      )}
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(attachment)}
          disabled={removing}
          aria-label={t("tasks.taskDetailModal.deleteFileFilename", { fileName: attachment.fileName })}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-fg-faint hover:bg-surface-muted hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </li>
  );
}

function DriveLinkSection({ taskId, driveUrl, canManage }: { taskId: number; driveUrl: string | null; canManage: boolean }) {
  const { t } = useI18n();
  const updateDriveUrl = useUpdateTaskDriveUrl();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(driveUrl ?? "");

  function save(value: string) {
    updateDriveUrl.mutate(
      { taskId, driveUrl: value },
      {
        onSuccess: () => {
          setEditing(false);
          showToast("success", value ? t("tasks.taskDetailModal.driveLinkSaved") : t("tasks.taskDetailModal.driveLinkRemoved"));
        },
        onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("tasks.taskDetailModal.couldnTSaveTheDriveLink")),
      },
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <Input
          label={t("tasks.taskDetailModal.googleDriveLink")}
          type="url"
          placeholder="https://drive.google.com/..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex gap-2">
          <Button onClick={() => save(draft.trim())} loading={updateDriveUrl.isPending}>
            {t("common.save")}
          </Button>
          <Button variant="secondary" onClick={() => setEditing(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {driveUrl && DRIVE_LINK_PATTERN.test(driveUrl) ? (
        <a
          href={driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-primary-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <GoogleDriveLogo size={18} aria-hidden className="shrink-0" />
          <span className="truncate">{driveUrl}</span>
        </a>
      ) : (
        <span className="text-sm text-fg-faint">{t("tasks.taskDetailModal.noDriveLinkYet")}</span>
      )}
      {canManage && (
        <>
          <Button
            variant="secondary"
            onClick={() => {
              setDraft(driveUrl ?? "");
              setEditing(true);
            }}
          >
            {driveUrl ? t("common.edit") : t("tasks.taskDetailModal.addLink")}
          </Button>
          {driveUrl && (
            <Button variant="secondary" onClick={() => save("")} loading={updateDriveUrl.isPending}>
              {t("common.remove")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

interface TaskDetailModalProps {
  taskId: number;
  onClose: () => void;
}

/**
 * Small window opened by clicking a task anywhere in the app (task table, board, home columns,
 * priority panel). Looks the task up by id in the shared list so it shows fresh data rather than a
 * snapshot taken when it was clicked. Attachments and the Drive link can be changed only when the
 * server says `canManage` (it re-checks on every request).
 */
export function TaskDetailModal({ taskId, onClose }: TaskDetailModalProps) {
  const { t, intlLocale } = useI18n();
  const { data: tasks } = useTasksList();
  const { data: currentUser } = useCurrentUser();
  const { navigateActiveTab } = useTabs();
  const addAttachment = useAddTaskAttachment();
  const removeAttachment = useRemoveTaskAttachment();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const task = tasks?.find((t) => t.id === taskId);
  if (!task || !currentUser) return null;

  function handleMessage(userId: number, name: string) {
    onClose();
    navigateActiveTab(`/dashboard/messages?with=${userId}&name=${encodeURIComponent(name)}`);
  }

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = ""; // allow re-picking the same file
    if (!file || !task) return;
    if (file.size > MAX_TASK_ATTACHMENT_BYTES) {
      showToast("error", t("common.filesCanBe5mbAtMost"));
      return;
    }
    addAttachment.mutate(
      { taskId: task.id, file },
      {
        onSuccess: () => showToast("success", t("tasks.taskDetailModal.fileAttached")),
        onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("tasks.taskDetailModal.couldnTAttachTheFile")),
      },
    );
  }

  function handleRemove(attachment: TaskAttachment) {
    if (!task) return;
    removeAttachment.mutate(
      { taskId: task.id, attachmentId: attachment.id },
      {
        onSuccess: () => showToast("success", t("tasks.taskDetailModal.fileDeleted")),
        onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("tasks.taskDetailModal.couldnTDeleteTheFile")),
      },
    );
  }

  const atLimit = task.attachments.length >= MAX_TASK_ATTACHMENTS;
  const canAddFiles = task.canManage && task.status !== "CANCELLED";

  return (
    <Modal title={t("tasks.taskDetailModal.taskDetails")} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h4 className="break-words text-lg font-semibold text-fg">{task.title}</h4>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[task.status]}>{t(TASK_STATUS_KEYS[task.status])}</Badge>
            <Badge tone={PRIORITY_TONE[task.priority]}>{t("tasks.taskDetailModal.priorityValue", { priority: t(TASK_PRIORITY_KEYS[task.priority]) })}</Badge>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-fg-muted">{t("common.description")}</p>
          <p className="whitespace-pre-wrap break-words text-sm text-fg">
            {task.description || <span className="text-fg-faint">{t("tasks.taskDetailModal.noDescription")}</span>}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <PersonRow
            label={t("tasks.taskDetailModal.assignedBy")}
            name={task.assignedByUserName}
            userId={task.assignedByUserId}
            currentUserId={currentUser.userId}
            onMessage={handleMessage}
          />
          {task.assigneeType === "USER" ? (
            <PersonRow
              label={t("tasks.taskDetailModal.assignee")}
              name={task.assigneeUserName ?? "-"}
              userId={task.assigneeUserId}
              currentUserId={currentUser.userId}
              onMessage={handleMessage}
            />
          ) : (
            <div className="rounded border border-line px-3 py-2">
              <p className="text-xs text-fg-muted">{t("tasks.taskDetailModal.assignedToADepartment")}</p>
              <p className="text-sm font-medium text-fg">{task.assigneeDepartmentName ?? "-"}</p>
            </div>
          )}
        </div>

        <TaskChecklist task={task} />

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-fg-muted">
              {t("tasks.taskDetailModal.attachmentsCount", { count: task.attachments.length, max: MAX_TASK_ATTACHMENTS })}
            </p>
            {canAddFiles && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={TASK_ATTACHMENT_ACCEPT}
                  onChange={handlePick}
                  className="hidden"
                  aria-label={t("common.chooseAnAttachment")}
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  loading={addAttachment.isPending}
                  disabled={atLimit}
                  title={atLimit ? t("tasks.taskDetailModal.maximumNumberOfFilesReached") : t("tasks.taskDetailModal.imagesPdfWordExcelPowerpointZip")}
                >
                  <Paperclip size={14} aria-hidden className="mr-1 inline" />
                  {t("tasks.taskDetailModal.addFile")}
                </Button>
              </>
            )}
          </div>
          {task.attachments.length === 0 ? (
            <p className="text-sm text-fg-faint">{t("tasks.taskDetailModal.noAttachmentsYet")}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {task.attachments.map((attachment) => (
                <AttachmentRow
                  key={attachment.id}
                  taskId={task.id}
                  attachment={attachment}
                  canRemove={task.canManage || attachment.uploadedByUserId === currentUser.userId}
                  removing={removeAttachment.isPending}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <p className="text-xs font-medium text-fg-muted">Google Drive</p>
          <DriveLinkSection taskId={task.id} driveUrl={task.driveUrl} canManage={task.canManage} />
        </section>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-fg-muted">{t("common.deadline")}</dt>
            <dd className="text-fg">{formatDate(task.dueDate, intlLocale)}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">{t("tasks.taskDetailModal.created")}</dt>
            <dd className="text-fg">{formatDateTime(task.createdAt, intlLocale)}</dd>
          </div>
          {task.completedAt && (
            <div>
              <dt className="text-xs text-fg-muted">{t("tasks.taskDetailModal.completedAt")}</dt>
              <dd className="text-fg">{formatDateTime(task.completedAt, intlLocale)}</dd>
            </div>
          )}
        </dl>
      </div>
    </Modal>
  );
}
