"use client";

import { useState } from "react";
import { PushPin } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlusButton } from "@/components/ui/PlusButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useDeleteNote, useNotes, useSetNotePinned } from "../hooks/useNotes";
import { NoteModal } from "./NoteModal";
import type { Note } from "../types";

/** Fully private per-user notes (Phase 6 plan) - no sharing UI at all, matching the backend. */
export function NotesPanel() {
  const { data: notes, isLoading } = useNotes();
  const deleteNote = useDeleteNote();
  const setPinned = useSetNotePinned();
  const { showToast } = useToast();

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Note của tôi</h2>
        <PlusButton label="Tạo ghi chú mới" onClick={() => setModalNote(null)} />
      </div>

      {(notes ?? []).length === 0 ? (
        <EmptyState title="Chưa có ghi chú nào" description="Tạo ghi chú đầu tiên bằng nút + bên trên." />
      ) : (
        <ul className="flex flex-col gap-2">
          {(notes ?? []).map((note) => (
            <li key={note.id} className="rounded border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{note.title}</p>
                  {note.content && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{note.content}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    title={note.pinned ? "Bỏ ghim" : "Ghim (hiện nổi ở mọi trang)"}
                    aria-label={note.pinned ? "Bỏ ghim" : "Ghim (hiện nổi ở mọi trang)"}
                    aria-pressed={note.pinned}
                    onClick={() => setPinned.mutate({ id: note.id, pinned: !note.pinned })}
                    className={`flex h-8 w-8 items-center justify-center rounded transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${note.pinned ? "text-primary" : "text-gray-400"}`}
                  >
                    <PushPin size={16} weight={note.pinned ? "fill" : "regular"} aria-hidden />
                  </button>
                  <Button variant="secondary" onClick={() => setModalNote(note)}>
                    Mở / Sửa
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(note.id)} loading={deleteNote.isPending}>
                    Xoá
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalNote !== undefined && <NoteModal note={modalNote} onClose={() => setModalNote(undefined)} />}
    </div>
  );
}
