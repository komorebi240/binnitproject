"use client";

import { useRef, useState } from "react";
import { Paperclip, Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  MAX_CHECKLIST_ITEMS,
  MAX_CHECKLIST_TEXT,
  MAX_TASK_ATTACHMENTS,
  MAX_TASK_ATTACHMENT_BYTES,
  TASK_ATTACHMENT_ACCEPT,
} from "../types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Checklist lines typed while creating a task; they are sent with the task. */
export function ChecklistDraftEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const text = draft.trim();
    if (!text || items.length >= MAX_CHECKLIST_ITEMS) return;
    onChange([...items, text]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-gray-700">
        Checklist (tuỳ chọn, {items.length}/{MAX_CHECKLIST_ITEMS})
      </p>
      {items.length > 0 && (
        <ul className="flex flex-col gap-1">
          {items.map((text, index) => (
            <li
              key={`${index}-${text}`}
              className="flex items-center gap-2 rounded border border-gray-200 px-2 py-1 text-sm"
            >
              <span className="min-w-0 flex-1 break-words text-gray-800">{text}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                aria-label={`Bỏ mục ${text}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-surface-muted hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          maxLength={MAX_CHECKLIST_TEXT}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds the line instead of submitting the whole task form.
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Thêm một bước..."
          aria-label="Mục checklist mới"
          className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={add}
          disabled={!draft.trim() || items.length >= MAX_CHECKLIST_ITEMS}
        >
          <Plus size={14} aria-hidden className="mr-1 inline" />
          Thêm
        </Button>
      </div>
    </div>
  );
}

/** Files picked while creating a task; they are uploaded right after the task exists. */
export function AttachmentDraftPicker({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow re-picking the same file
    const accepted: File[] = [];
    for (const file of picked) {
      if (file.size > MAX_TASK_ATTACHMENT_BYTES) {
        showToast("error", `${file.name}: tối đa 5MB`);
      } else if (files.length + accepted.length >= MAX_TASK_ATTACHMENTS) {
        showToast("error", `Tối đa ${MAX_TASK_ATTACHMENTS} tệp`);
        break;
      } else {
        accepted.push(file);
      }
    }
    if (accepted.length > 0) onChange([...files, ...accepted]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-700">
          Tài liệu đính kèm (tuỳ chọn, {files.length}/{MAX_TASK_ATTACHMENTS})
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={TASK_ATTACHMENT_ACCEPT}
          onChange={handlePick}
          className="hidden"
          aria-label="Chọn tệp đính kèm"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={files.length >= MAX_TASK_ATTACHMENTS}
          title="Ảnh, PDF, Word, Excel, PowerPoint, ZIP, TXT, CSV - tối đa 5MB mỗi tệp"
        >
          <Paperclip size={14} aria-hidden className="mr-1 inline" />
          Chọn tệp
        </Button>
      </div>
      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((file, index) => (
            <li
              key={`${index}-${file.name}`}
              className="flex items-center gap-2 rounded border border-gray-200 px-2 py-1 text-sm"
            >
              <Paperclip size={14} aria-hidden className="shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-gray-800">{file.name}</span>
              <span className="shrink-0 text-xs text-gray-500">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                aria-label={`Bỏ tệp ${file.name}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-surface-muted hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
