"use client";

import { useState } from "react";
import { DotsThreeVertical, DownloadSimple, File as FileIcon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { useToast } from "@/components/ui/Toast";
import { useAuthedBlobUrl } from "@/lib/hooks/useAuthedBlobUrl";
import type { PresenceStatus } from "@/features/auth/types";
import { downloadAttachment } from "../api/messageApi";
import type { Message, MessageAttachment } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImageAttachment({ attachment }: { attachment: MessageAttachment }) {
  const { t } = useI18n();
  const src = useAuthedBlobUrl(`/messages/attachments/${attachment.id}`);
  const [open, setOpen] = useState(false);
  if (!src) {
    return <div className="h-32 w-48 animate-pulse rounded bg-black/10" aria-label={t("messages.messageBubble.loadingImage")} />;
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={attachment.fileName}
        className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL, next/image can't optimize it */}
        <img src={src} alt={attachment.fileName} className="max-h-60 max-w-full rounded-lg object-cover" />
      </button>
      {open && <ImageLightbox src={src} alt={attachment.fileName} onClose={() => setOpen(false)} />}
    </>
  );
}

function FileAttachment({ attachment }: { attachment: MessageAttachment }) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await downloadAttachment(attachment.id);
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
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className="flex w-full items-center gap-2 rounded border border-line bg-surface px-2.5 py-2 text-left text-fg transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
    >
      <FileIcon size={22} aria-hidden className="shrink-0 text-primary-text" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{attachment.fileName}</span>
        <span className="block text-xs text-fg-muted">{formatSize(attachment.sizeBytes)}</span>
      </span>
      <DownloadSimple size={18} aria-hidden className="shrink-0 text-fg-muted" />
    </button>
  );
}

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  /** Whose avatar to show next to this bubble. */
  senderName: string;
  senderAvatarUrl: string | null;
  senderPresence?: PresenceStatus;
  onRecall: (message: Message) => void;
}

/** One chat message with the sender's avatar, an optional image/file attachment, and (own messages only) a recall menu. */
export function MessageBubble({ message, isMine, senderName, senderAvatarUrl, senderPresence, onRecall }: MessageBubbleProps) {
  const { t, intlLocale } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const canRecall = isMine && !message.recalled;

  const bubbleClassName = message.recalled
    ? "border border-dashed border-line-strong bg-transparent italic text-fg-muted"
    : isMine
      ? "bg-primary text-primary-foreground"
      : "bg-surface-muted text-fg";

  return (
    <div className={`group flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
      <Avatar avatarUrl={senderAvatarUrl} fullName={senderName} presenceStatus={senderPresence} size="sm" />

      <div className={`relative flex max-w-xs flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
        {/* A picture is shown on its own, without a coloured bubble (and its padding) around it. */}
        {!message.recalled && message.attachment?.image && <ImageAttachment attachment={message.attachment} />}
        {(message.recalled || message.body || (message.attachment && !message.attachment.image)) && (
          <div className={`flex max-w-full flex-col gap-1.5 rounded-lg px-3 py-1.5 text-sm ${bubbleClassName}`}>
            {message.recalled ? (
              <span>{t("messages.messageBubble.messageRecalled")}</span>
            ) : (
              <>
                {message.attachment && !message.attachment.image && <FileAttachment attachment={message.attachment} />}
                {message.body && <span className="whitespace-pre-wrap break-words">{message.body}</span>}
              </>
            )}
          </div>
        )}
        <span className="text-[10px] text-fg-faint">
          {new Date(message.createdAt).toLocaleTimeString(intlLocale, { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {canRecall && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t("messages.messageBubble.messageOptions")}
            className="flex h-7 w-7 items-center justify-center rounded text-fg-faint opacity-0 transition-opacity duration-150 hover:bg-surface-muted hover:text-fg-soft focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary group-hover:opacity-100"
          >
            <DotsThreeVertical size={16} weight="bold" aria-hidden />
          </button>
          {menuOpen && (
            <>
              <button type="button" aria-label={t("common.close")} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-20 cursor-default" />
              <div className="animate-fade-in absolute bottom-8 right-0 z-30 w-32 rounded glass py-1 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onRecall(message);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-danger hover:bg-surface-muted"
                >
                  {t("common.recall")}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
