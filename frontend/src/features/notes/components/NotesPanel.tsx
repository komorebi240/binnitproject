"use client";

import { useState } from "react";
import { PushPin } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useCreateNote, useDeleteNote, useNotes, useSetNotePinned, useUpdateNote } from "../hooks/useNotes";
import { NoteExpandModal } from "./NoteExpandModal";
import type { Note } from "../types";

/** Fully private per-user notes (Phase 6 plan) — no sharing UI at all, matching the backend. */
export function NotesPanel() {
  const { data: notes, isLoading } = useNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const setPinned = useSetNotePinned();
  const { showToast } = useToast();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedNote, setExpandedNote] = useState<Note | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function startEditing(note: Note) {
    setEditingId(note.id);
    setForm({ title: note.title, content: note.content ?? "" });
  }

  function startNew() {
    setEditingId(0);
    setForm({ title: "", content: "" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      if (editingId) {
        await updateNote.mutateAsync({ id: editingId, input: form });
        showToast("success", "Đã lưu ghi chú");
      } else {
        await createNote.mutateAsync(form);
        showToast("success", "Đã tạo ghi chú");
      }
      setEditingId(null);
      setForm({ title: "", content: "" });
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không lưu được ghi chú");
    }
  }

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
      {editingId === null ? (
        <Button onClick={startNew}>Tạo ghi chú mới</Button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-gray-200 p-4">
          <Input label="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Nội dung</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              className="rounded border border-gray-300 px-3 py-2 text-sm transition-colors duration-150 hover:border-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>
          {errorMessage && (
            <p role="alert" className="text-sm text-danger">
              {errorMessage}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" loading={createNote.isPending || updateNote.isPending}>
              Lưu
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
              Huỷ
            </Button>
          </div>
        </form>
      )}

      {(notes ?? []).length === 0 ? (
        <EmptyState title="Chưa có ghi chú nào" description="Tạo ghi chú đầu tiên bằng nút bên trên." />
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
                  <Button variant="secondary" onClick={() => setExpandedNote(note)}>
                    Mở rộng
                  </Button>
                  <Button variant="secondary" onClick={() => startEditing(note)}>
                    Sửa
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

      {expandedNote && <NoteExpandModal note={expandedNote} onClose={() => setExpandedNote(null)} />}
    </div>
  );
}
