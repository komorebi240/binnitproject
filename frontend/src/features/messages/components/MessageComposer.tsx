"use client";

import { useRef, useState } from "react";
import { Paperclip, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES } from "../types";
import { useSendMessage } from "../hooks/useMessages";

/** Pill-shaped input with a paperclip: sends text, or a picked file with the text as its caption. */
export function MessageComposer({ recipientUserId }: { recipientUserId: number }) {
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
      showToast("error", "Tệp tối đa 5MB");
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
      showToast("error", err instanceof ApiRequestError ? err.message : "Không gửi được tin nhắn");
    }
  }

  return (
    <form onSubmit={handleSend} className="mt-3 flex flex-col gap-2">
      {file && (
        <div className="flex w-fit max-w-full items-center gap-2 rounded-full border border-gray-200 bg-surface-muted py-1 pl-3 pr-1 text-xs text-gray-700">
          <Paperclip size={14} aria-hidden />
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => setFile(null)}
            aria-label="Bỏ tệp đính kèm"
            className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X size={12} aria-hidden />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-surface-muted px-2 py-1.5 shadow-sm transition-colors duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <input ref={fileInputRef} type="file" accept={ATTACHMENT_ACCEPT} onChange={handlePick} className="hidden" aria-label="Chọn tệp đính kèm" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Đính kèm ảnh hoặc tệp (tối đa 5MB)"
          aria-label="Đính kèm ảnh hoặc tệp"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors duration-150 hover:bg-gray-200 hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Paperclip size={18} aria-hidden />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={file ? "Thêm chú thích (tuỳ chọn)..." : "Nhập tin nhắn..."}
          maxLength={2000}
          className="flex-1 bg-transparent px-1 py-1.5 text-sm outline-none"
        />
        <Button type="submit" loading={sendMessage.isPending} className="rounded-full px-4">
          Gửi
        </Button>
      </div>
    </form>
  );
}
