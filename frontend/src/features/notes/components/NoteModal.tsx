"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useCreateNote, useUpdateNote } from "../hooks/useNotes";
import type { Note } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
interface NoteModalProps {
  /** null = create a new note, otherwise view/edit this one. */
  note: Note | null;
  onClose: () => void;
}

/** One dialog for creating and for viewing/editing a note - replaces the old always-visible inline form. */
export function NoteModal({ note, onClose }: NoteModalProps) {
  const { t } = useI18n();
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
        showToast("success", t("notes.noteModal.noteSaved"));
      } else {
        await createNote.mutateAsync({ title, content });
        showToast("success", t("notes.noteModal.noteCreated"));
      }
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("notes.noteModal.couldnTSaveTheNote"));
    }
  }

  return (
    <Modal title={note ? t("notes.noteModal.note") : t("notes.noteModal.newNote")} onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label={t("common.title")} value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Textarea label={t("notes.noteModal.content")} value={content} onChange={(e) => setContent(e.target.value)} rows={14} />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button type="submit" loading={createNote.isPending || updateNote.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
