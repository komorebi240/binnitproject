"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DotsSixVertical, Minus, PushPin, X } from "@phosphor-icons/react";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { useNotes, useSetNotePinned, useUpdateNote } from "../hooks/useNotes";

interface Offset {
  /** Distance from the right / bottom edge of the viewport, in px. */
  right: number;
  bottom: number;
}

const DEFAULT_OFFSET: Offset = { right: 16, bottom: 16 };
const KEYBOARD_STEP = 16;
const POSITION_KEY_PREFIX = "pinned-note-position:";

function readOffset(userId: number): Offset {
  try {
    const raw = window.localStorage.getItem(POSITION_KEY_PREFIX + userId);
    if (!raw) return DEFAULT_OFFSET;
    const parsed = JSON.parse(raw) as Partial<Offset>;
    return typeof parsed.right === "number" && typeof parsed.bottom === "number"
      ? { right: parsed.right, bottom: parsed.bottom }
      : DEFAULT_OFFSET;
  } catch {
    return DEFAULT_OFFSET; // blocked storage or corrupt value
  }
}

/**
 * "Always on display" for a pinned note - floats on every `/dashboard` page (mounted once in
 * dashboard/layout.tsx) until unpinned, and can be dragged anywhere on screen by its grip (or moved
 * with the arrow keys when the grip has focus). The position is remembered per account and kept
 * inside the viewport, also after the window is resized. Edits save inline via the same
 * `useUpdateNote` the full Notes page uses.
 */
export function PinnedNoteWidget() {
  const { data: currentUser } = useCurrentUser();
  const { data: notes } = useNotes();
  const updateNote = useUpdateNote();
  const setPinned = useSetNotePinned();
  const [minimized, setMinimized] = useState(false);
  const [offset, setOffset] = useState<Offset>(DEFAULT_OFFSET);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOffset: Offset } | null>(null);
  const userId = currentUser?.userId;

  useEffect(() => {
    if (userId !== undefined) setOffset(readOffset(userId));
  }, [userId]);

  /** Keeps the whole widget on screen for a candidate offset. */
  const clamp = useCallback((candidate: Offset): Offset => {
    const box = containerRef.current?.getBoundingClientRect();
    const width = box?.width ?? 0;
    const height = box?.height ?? 0;
    return {
      right: Math.min(Math.max(0, candidate.right), Math.max(0, window.innerWidth - width)),
      bottom: Math.min(Math.max(0, candidate.bottom), Math.max(0, window.innerHeight - height)),
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      setOffset((current) => clamp(current));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clamp]);

  const persist = useCallback(
    (next: Offset) => {
      if (userId === undefined) return;
      try {
        window.localStorage.setItem(POSITION_KEY_PREFIX + userId, JSON.stringify(next));
      } catch {
        // Position just won't be remembered.
      }
    },
    [userId],
  );

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, startOffset: offset };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    // Moving the pointer right/down means a SMALLER distance from the right/bottom edge.
    setOffset(
      clamp({
        right: drag.startOffset.right - (event.clientX - drag.startX),
        bottom: drag.startOffset.bottom - (event.clientY - drag.startY),
      }),
    );
  }

  function handlePointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    persist(offset);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    const delta = {
      ArrowLeft: { right: KEYBOARD_STEP, bottom: 0 },
      ArrowRight: { right: -KEYBOARD_STEP, bottom: 0 },
      ArrowUp: { right: 0, bottom: -KEYBOARD_STEP },
      ArrowDown: { right: 0, bottom: KEYBOARD_STEP },
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = clamp({ right: offset.right + delta.right, bottom: offset.bottom + delta.bottom });
    setOffset(next);
    persist(next);
  }

  const pinnedNotes = (notes ?? []).filter((n) => n.pinned);
  if (pinnedNotes.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-40 flex flex-col gap-2"
      style={{ right: offset.right, bottom: offset.bottom }}
    >
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
            <div className="flex items-center justify-between gap-1">
              <div
                role="button"
                tabIndex={0}
                aria-label="Kéo để di chuyển ghi chú (hoặc dùng phím mũi tên)"
                title="Kéo để di chuyển"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onKeyDown={handleKeyDown}
                className="flex min-w-0 flex-1 cursor-grab touch-none select-none items-center gap-1 rounded active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <DotsSixVertical size={16} className="shrink-0 text-gray-400" aria-hidden />
                <p className="truncate text-sm font-semibold text-gray-900">{note.title}</p>
              </div>
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
