"use client";

import { useState } from "react";
import { MagnifyingGlass, PushPin, Trash } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Highlight } from "@/components/ui/Highlight";
import { PlusButton } from "@/components/ui/PlusButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
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

  // undefined = closed, null = creating a new note, Note = viewing/editing that note
  const [modalNote, setModalNote] = useState<Note | null | undefined>(undefined);

  function handleDelete(id: number) {
    deleteNote.mutate(id, {
      onSuccess: () => showToast("success", "Đã xoá ghi chú"),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không xoá được"),
    });
  }

  if (isLoading) {
    return <Skeleton rows={3} />;
  }

  const all = notes ?? [];
  const shown = all
    .filter((note) => matchesAllWords(`${note.title} ${note.content ?? ""}`, query))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Note của tôi</h2>
          <PlusButton label="Tạo ghi chú mới" onClick={() => setModalNote(null)} />
        </div>
        {all.length > 0 && (
          <label className="relative ml-auto block w-full sm:w-64">
            <span className="sr-only">Tìm trong ghi chú</span>
            <MagnifyingGlass size={16} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm trong ghi chú..."
              className="w-full rounded border border-gray-200 bg-white py-1.5 pl-8 pr-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            />
          </label>
        )}
      </div>

      {all.length === 0 ? (
        <EmptyState title="Chưa có ghi chú nào" description="Tạo ghi chú đầu tiên bằng nút + bên trên." />
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">Không có ghi chú nào khớp &quot;{query}&quot;</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
          {shown.map((note) => (
            <li
              key={note.id}
              className={`group relative flex min-h-40 flex-col rounded-lg border bg-surface transition-[border-color,box-shadow] duration-150 hover:shadow-sm ${note.pinned ? "border-primary/40" : "border-gray-200 hover:border-gray-300"}`}
            >
              <button
                type="button"
                onClick={() => setModalNote(note)}
                className="flex min-h-0 flex-1 flex-col gap-1.5 rounded-lg p-4 pr-16 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="line-clamp-1 font-semibold text-gray-900">
                  <Highlight text={note.title} query={query} />
                </span>
                {note.content ? (
                  <span className="line-clamp-5 whitespace-pre-wrap break-words text-sm text-gray-600">
                    <Highlight text={note.content} query={query} />
                  </span>
                ) : (
                  <span className="text-sm italic text-gray-400">Chưa có nội dung</span>
                )}
                <span className="mt-auto pt-2 text-xs text-gray-400">{formatEdited(note)}</span>
              </button>

              <div className="absolute right-2 top-2 flex">
                <button
                  type="button"
                  title={note.pinned ? "Bỏ ghim" : "Ghim (hiện nổi ở mọi trang)"}
                  aria-label={note.pinned ? "Bỏ ghim" : "Ghim (hiện nổi ở mọi trang)"}
                  aria-pressed={note.pinned}
                  onClick={() => setPinned.mutate({ id: note.id, pinned: !note.pinned })}
                  className={`${ICON_BUTTON} ${note.pinned ? "text-primary" : "text-gray-400 hover:text-gray-700"}`}
                >
                  <PushPin size={16} weight={note.pinned ? "fill" : "regular"} aria-hidden />
                </button>
                <button
                  type="button"
                  title="Xoá ghi chú"
                  aria-label={`Xoá ghi chú ${note.title}`}
                  onClick={() => handleDelete(note.id)}
                  disabled={deleteNote.isPending}
                  className={`${ICON_BUTTON} text-gray-400 opacity-0 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-40`}
                >
                  <Trash size={16} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalNote !== undefined && <NoteModal note={modalNote} onClose={() => setModalNote(undefined)} />}
    </div>
  );
}
