"use client";

import { useState } from "react";
import { ArrowBendUpRight, DownloadSimple, Eye, File as FileIcon } from "@phosphor-icons/react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/ActionMenu";
import { Avatar } from "@/components/ui/Avatar";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import type { PresenceStatus } from "@/features/auth/types";
import { previewKind } from "@/features/fileViewer/fileSources";
import { useOpenFile } from "@/features/fileViewer/hooks/useOpenFile";
import { attachmentUrl } from "../api/messageApi";
import type { Message, MessageAttachment } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Saves the attachment as a file; the server sends it as a download, the browser streams it to disk. */
function saveAttachment(attachment: MessageAttachment) {
  const link = document.createElement("a");
  link.href = attachmentUrl(attachment.id, { download: true });
  link.download = attachment.fileName;
  link.click();
}

function ImageAttachment({ attachment }: { attachment: MessageAttachment }) {
  const [open, setOpen] = useState(false);
  const src = attachmentUrl(attachment.id);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={attachment.fileName}
        className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- an authenticated API file, next/image can't optimize it */}
        <img src={src} alt={attachment.fileName} loading="lazy" className="max-h-60 max-w-full rounded-lg object-cover" />
      </button>
      {open && (
        <ImageLightbox
          src={src}
          alt={attachment.fileName}
          downloadHref={attachmentUrl(attachment.id, { download: true })}
          downloadName={attachment.fileName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Plays in the conversation with the browser's own controls; the player fetches the file in byte ranges, so it starts
 * before the whole video has arrived and can seek. A codec this browser cannot decode falls back to a download card.
 */
function VideoAttachment({ attachment }: { attachment: MessageAttachment }) {
  const { t } = useI18n();
  const [unplayable, setUnplayable] = useState(false);
  if (unplayable) {
    return (
      <div className="flex max-w-xs flex-col gap-1.5 rounded-lg bg-surface-muted px-3 py-2 text-sm text-fg">
        <FileAttachment attachment={attachment} />
        <span className="text-xs text-fg-muted">{t("messages.messageBubble.videoCannotPlay")}</span>
      </div>
    );
  }
  return (
    <video
      controls
      playsInline
      preload="metadata"
      src={attachmentUrl(attachment.id)}
      aria-label={attachment.fileName}
      onError={() => setUnplayable(true)}
      className="max-h-72 w-72 max-w-full rounded-lg bg-black"
    />
  );
}

/** A document that can be read in a tab opens there; anything else (or the small download button) is downloaded. */
function FileAttachment({ attachment }: { attachment: MessageAttachment }) {
  const { t } = useI18n();
  const openFile = useOpenFile();
  if (previewKind(attachment.fileName, attachment.contentType)) {
    return (
      <span className="flex w-full items-center gap-1 rounded border border-line bg-surface text-fg">
        <button
          type="button"
          onClick={() => openFile({ kind: "chat", attachmentId: attachment.id }, attachment.fileName)}
          title={t("messages.messageBubble.openInTab")}
          className="flex min-w-0 flex-1 items-center gap-2 rounded px-2.5 py-2 text-left transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <FileIcon size={22} aria-hidden className="shrink-0 text-primary-text" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{attachment.fileName}</span>
            <span className="block text-xs text-fg-muted">{formatSize(attachment.sizeBytes)}</span>
          </span>
          <Eye size={18} aria-hidden className="shrink-0 text-fg-muted" />
        </button>
        <a
          href={attachmentUrl(attachment.id, { download: true })}
          download={attachment.fileName}
          aria-label={t("messages.messageBubble.download")}
          title={t("messages.messageBubble.download")}
          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <DownloadSimple size={18} aria-hidden />
        </a>
      </span>
    );
  }
  return (
    <a
      href={attachmentUrl(attachment.id, { download: true })}
      download={attachment.fileName}
      className="flex w-full items-center gap-2 rounded border border-line bg-surface px-2.5 py-2 text-left text-fg transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <FileIcon size={22} aria-hidden className="shrink-0 text-primary-text" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{attachment.fileName}</span>
        <span className="block text-xs text-fg-muted">{formatSize(attachment.sizeBytes)}</span>
      </span>
      <DownloadSimple size={18} aria-hidden className="shrink-0 text-fg-muted" />
    </a>
  );
}

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  /** Whose avatar to show next to this bubble. */
  senderName: string;
  senderAvatarUrl: string | null;
  senderPresence?: PresenceStatus;
  onCopy: (message: Message) => void;
  onForward: (message: Message) => void;
  onHide: (message: Message) => void;
  onRecall: (message: Message) => void;
}

/**
 * One chat message with the sender's avatar, an optional image, video or file, and a menu: copy, forward, download,
 * delete for me, and - own messages only - recall for both sides.
 */
export function MessageBubble({
  message,
  isMine,
  senderName,
  senderAvatarUrl,
  senderPresence,
  onCopy,
  onForward,
  onHide,
  onRecall,
}: MessageBubbleProps) {
  const { t, intlLocale } = useI18n();
  const attachment = message.recalled ? null : message.attachment;
  const media = attachment && (attachment.image || attachment.video) ? attachment : null;
  const openFile = useOpenFile();
  const viewable = attachment && !media && previewKind(attachment.fileName, attachment.contentType) ? attachment : null;

  const bubbleClassName = message.recalled
    ? "border border-dashed border-line-strong bg-transparent italic text-fg-muted"
    : isMine
      ? "bg-primary text-primary-foreground"
      : "bg-surface-muted text-fg";

  const menuItems: ActionMenuItem[] = [
    ...(!message.recalled && message.body ? [{ label: t("messages.messageBubble.copy"), onSelect: () => onCopy(message) }] : []),
    ...(!message.recalled ? [{ label: t("messages.messageBubble.forward"), onSelect: () => onForward(message) }] : []),
    ...(viewable
      ? [{ label: t("messages.messageBubble.openInTab"), onSelect: () => openFile({ kind: "chat", attachmentId: viewable.id }, viewable.fileName) }]
      : []),
    ...(attachment ? [{ label: t("messages.messageBubble.download"), onSelect: () => saveAttachment(attachment) }] : []),
    { label: t("messages.messageBubble.deleteForMe"), onSelect: () => onHide(message), danger: true },
    ...(isMine && !message.recalled ? [{ label: t("common.recall"), onSelect: () => onRecall(message), danger: true }] : []),
  ];

  return (
    <div className={`group flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
      <Avatar avatarUrl={senderAvatarUrl} fullName={senderName} presenceStatus={senderPresence} size="sm" />

      <div className={`relative flex max-w-xs flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
        {message.forwarded && !message.recalled && (
          <span className="flex items-center gap-1 text-[11px] text-fg-muted">
            <ArrowBendUpRight size={12} aria-hidden />
            {t("messages.messageBubble.forwarded")}
          </span>
        )}
        {/* A picture or a video is shown on its own, without a coloured bubble (and its padding) around it. */}
        {media?.image && <ImageAttachment attachment={media} />}
        {media?.video && <VideoAttachment attachment={media} />}
        {(message.recalled || message.body || (attachment && !media)) && (
          <div className={`flex max-w-full flex-col gap-1.5 rounded-lg px-3 py-1.5 text-sm ${bubbleClassName}`}>
            {message.recalled ? (
              <span>{t("messages.messageBubble.messageRecalled")}</span>
            ) : (
              <>
                {attachment && !media && <FileAttachment attachment={attachment} />}
                {message.body && <span className="whitespace-pre-wrap break-words">{message.body}</span>}
              </>
            )}
          </div>
        )}
        <span className="text-[10px] text-fg-faint">
          {new Date(message.createdAt).toLocaleTimeString(intlLocale, { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Always visible on touch screens; on larger screens it appears with the pointer or keyboard focus. */}
      <div className="transition-opacity duration-150 focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100">
        <ActionMenu items={menuItems} label={t("messages.messageBubble.messageOptions")} size="sm" />
      </div>
    </div>
  );
}
