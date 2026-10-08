"use client";

import { useRef, useState } from "react";
import { Paperclip, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES } from "../types";
import { useSendMessage } from "../hooks/useMessages";

import { useI18n } from "@/lib/i18n/useI18n";
/** Pill-shaped input with a paperclip: sends text, or a picked file with the text as its caption. */
export function MessageComposer({ recipientUserId }: { recipientUserId: number }) {
  const { t } = useI18n();
  const sendMessage = useSendMessage(recipientUserId);
  const { showToast } = useToast();
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = ""; // allow re-picking the same file after removing it
    if (!picked) return;
    if (picked.size > MAX_ATTACHMENT_BYTES) {
      showToast("error", t("common.filesCanBe5mbAtMost"));
      return;
    }
    setFile(picked);
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body && !file) return;
    try {
      await sendMessage.mutateAsync({ body, file });
      setDraft("");
      setFile(null);
    } catch (err) {
      showToast("error", err instanceof ApiRequestError ? err.message : t("common.couldnTSendTheMessage"));
    }
  }

  return (
    <form onSubmit={handleSend} className="mt-3 flex flex-col gap-2">
      {file && (
        <div className="flex w-fit max-w-full items-center gap-2 rounded-full border border-line bg-surface-muted py-1 pl-3 pr-1 text-xs text-fg-soft">
          <Paperclip size={14} aria-hidden />
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => setFile(null)}
            aria-label={t("messages.messageComposer.removeTheAttachment")}
            className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X size={12} aria-hidden />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-full border border-line bg-surface-muted px-2 py-1.5 shadow-sm transition-colors duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <input ref={fileInputRef} type="file" accept={ATTACHMENT_ACCEPT} onChange={handlePick} className="hidden" aria-label={t("common.chooseAnAttachment")} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title={t("messages.messageComposer.attachAnImageOrFile5mb")}
          aria-label={t("messages.messageComposer.attachAnImageOrFile")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors duration-150 hover:bg-line hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Paperclip size={18} aria-hidden />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={file ? t("messages.messageComposer.addACaptionOptional") : t("messages.messageComposer.typeAMessage")}
          maxLength={2000}
          className="flex-1 bg-transparent px-1 py-1.5 text-sm outline-none"
        />
        <Button type="submit" loading={sendMessage.isPending} className="rounded-full px-4">
          {t("common.send")}
        </Button>
      </div>
    </form>
  );
}
