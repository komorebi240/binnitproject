"use client";

import { useState } from "react";
import { Minus, PushPin, X } from "@phosphor-icons/react";
import { useNotes, useSetNotePinned, useUpdateNote } from "../hooks/useNotes";

/**
 * "Always on display" for a pinned note (Phase 7 plan) — floats bottom-right on every
 * `/dashboard` page (mounted once in dashboard/layout.tsx) until unpinned. Edits save inline via
 * the same `useUpdateNote` the full Notes page uses. Phosphor SVG icons (not emoji) and explicit
 * 24px+ square hit areas with a visible focus ring on every control — flagged by a UI/UX review
 * pass (referencing nextlevelbuilder/ui-ux-pro-max-skill) as the two most common gaps for
 * icon-only buttons like these.
 */
export function PinnedNoteWidget() {
  const { data: notes } = useNotes();
  const updateNote = useUpdateNote();
  const setPinned = useSetNotePinned();
  const [minimized, setMinimized] = useState(false);

  const pinnedNotes = (notes ?? []).filter((n) => n.pinned);
  if (pinnedNotes.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
      {minimized ? (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          title="Mở ghi chú đã ghim"
          aria-label="Mở ghi chú đã ghim"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <PushPin size={18} weight="fill" aria-hidden />
        </button>
      ) : (
        pinnedNotes.map((note) => (
          <div key={note.id} className="animate-fade-in flex w-72 flex-col gap-1.5 rounded border border-gray-200 bg-white p-3 shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">{note.title}</p>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  title="Thu nhỏ"
                  aria-label="Thu nhỏ"
                  onClick={() => setMinimized(true)}
                  className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-surface-muted hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <Minus size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  title="Bỏ ghim"
                  aria-label="Bỏ ghim"
                  onClick={() => setPinned.mutate({ id: note.id, pinned: false })}
                  className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-surface-muted hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            </div>
            <textarea
              defaultValue={note.content ?? ""}
              onBlur={(e) => {
                if (e.target.value !== note.content) {
                  updateNote.mutate({ id: note.id, input: { title: note.title, content: e.target.value } });
                }
              }}
              rows={4}
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 transition-colors duration-150 hover:border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>
        ))
      )}
    </div>
  );
}
