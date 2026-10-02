"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useCreateNote, useUpdateNote } from "../hooks/useNotes";
import type { Note } from "../types";

interface NoteModalProps {
  /** null = create a new note, otherwise view/edit this one. */
  note: Note | null;
  onClose: () => void;
}

/** One dialog for creating and for viewing/editing a note - replaces the old always-visible inline form. */
export function NoteModal({ note, onClose }: NoteModalProps) {
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const { showToast } = useToast();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      if (note) {
        await updateNote.mutateAsync({ id: note.id, input: { title, content } });
        showToast("success", "Đã lưu ghi chú");
      } else {
        await createNote.mutateAsync({ title, content });
        showToast("success", "Đã tạo ghi chú");
      }
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không lưu được ghi chú");
    }
  }

  return (
    <Modal title={note ? "Ghi chú" : "Ghi chú mới"} onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div className="flex flex-col gap-1">
          <label htmlFor="note-content" className="text-sm font-medium text-gray-700">
            Nội dung
          </label>
          <textarea
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            className="rounded border border-gray-300 px-3 py-2 text-sm transition-colors duration-150 hover:border-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button type="submit" loading={createNote.isPending || updateNote.isPending}>
            Lưu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
