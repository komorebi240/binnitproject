"use client";

import { useRef, useState } from "react";
import { MagnifyingGlass, PushPin, Trash } from "@phosphor-icons/react";
import { AnimatedList } from "@/components/ui/AnimatedList";
import { EmptyState } from "@/components/ui/EmptyState";
import { Highlight } from "@/components/ui/Highlight";
import { PlusButton } from "@/components/ui/PlusButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useFlipList } from "@/lib/hooks/useFlipList";
import { matchesAllWords } from "@/lib/textMatch";
import { useDeleteNote, useNotes, useSetNotePinned } from "../hooks/useNotes";
import { NoteModal } from "./NoteModal";
import type { Note } from "../types";

const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

function formatEdited(note: Note): string {
  return new Date(note.updatedAt ?? note.createdAt).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric", year: "numeric" });
}

/** Fully private per-user notes (Phase 6 plan) - no sharing UI at all, matching the backend. Pinned notes come first. */
export function NotesPanel() {
  const { data: notes, isLoading } = useNotes();
  const deleteNote = useDeleteNote();
  const setPinned = useSetNotePinned();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLElement>(null);

  // undefined = closed, null = creating a new note, Note = viewing/editing that note
  const [modalNote, setModalNote] = useState<Note | null | undefined>(undefined);

  function handleDelete(id: number) {
    deleteNote.mutate(id, {
      onSuccess: () => showToast("success", "Đã xoá ghi chú"),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không xoá được"),
    });
  }

  const all = notes ?? [];
  const shown = all
    .filter((note) => matchesAllWords(`${note.title} ${note.content ?? ""}`, query))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  // Searching or pinning rearranges the cards: they glide to their new places instead of jumping.
  const captureLayout = useFlipList(listRef, shown.map((note) => note.id).join(","));

  if (isLoading) {
    return <Skeleton rows={3} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-fg">Note của tôi</h2>
          <PlusButton label="Tạo ghi chú mới" onClick={() => setModalNote(null)} />
        </div>
        {all.length > 0 && (
          <label className="relative ml-auto block w-full sm:w-64">
            <span className="sr-only">Tìm trong ghi chú</span>
            <MagnifyingGlass size={16} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-faint" />
            <input
              value={query}
              onChange={(e) => {
                captureLayout();
                setQuery(e.target.value);
              }}
              placeholder="Tìm trong ghi chú..."
              className="w-full rounded border border-line bg-surface py-1.5 pl-8 pr-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            />
          </label>
        )}
      </div>

      {all.length === 0 ? (
        <EmptyState title="Chưa có ghi chú nào" description="Tạo ghi chú đầu tiên bằng nút + bên trên." />
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-fg-faint">Không có ghi chú nào khớp &quot;{query}&quot;</p>
      ) : (
        <AnimatedList ref={listRef} className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
          {shown.map((note) => (
            <li
              key={note.id}
              className={`glass-card group relative flex min-h-40 flex-col rounded-lg transition-[border-color,box-shadow] duration-150 hover:shadow-sm ${note.pinned ? "border-primary/50" : "hover:border-line-strong"}`}
            >
              <button
                type="button"
                onClick={() => setModalNote(note)}
                className="flex min-h-0 flex-1 flex-col gap-1.5 rounded-lg p-4 pr-16 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="line-clamp-1 font-semibold text-fg">
                  <Highlight text={note.title} query={query} />
                </span>
                {note.content ? (
                  <span className="line-clamp-5 whitespace-pre-wrap break-words text-sm text-fg-soft">
                    <Highlight text={note.content} query={query} />
                  </span>
                ) : (
                  <span className="text-sm italic text-fg-faint">Chưa có nội dung</span>
                )}
                <span className="mt-auto pt-2 text-xs text-fg-faint">{formatEdited(note)}</span>
              </button>

              <div className="absolute right-2 top-2 flex">
                <button
                  type="button"
                  title={note.pinned ? "Bỏ ghim" : "Ghim (hiện nổi ở mọi trang)"}
                  aria-label={note.pinned ? "Bỏ ghim" : "Ghim (hiện nổi ở mọi trang)"}
                  aria-pressed={note.pinned}
                  onClick={() => {
                    captureLayout();
                    setPinned.mutate({ id: note.id, pinned: !note.pinned });
                  }}
                  className={`${ICON_BUTTON} ${note.pinned ? "text-primary-text" : "text-fg-faint hover:text-fg-soft"}`}
                >
                  <PushPin size={16} weight={note.pinned ? "fill" : "regular"} aria-hidden />
                </button>
                <button
                  type="button"
                  title="Xoá ghi chú"
                  aria-label={`Xoá ghi chú ${note.title}`}
                  onClick={() => handleDelete(note.id)}
                  disabled={deleteNote.isPending}
                  className={`${ICON_BUTTON} text-fg-faint opacity-0 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-40`}
                >
                  <Trash size={16} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </AnimatedList>
      )}

      {modalNote !== undefined && <NoteModal note={modalNote} onClose={() => setModalNote(undefined)} />}
    </div>
  );
}
