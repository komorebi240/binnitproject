/**
 * How a piece of text gets from Smart select onto a whiteboard. Dragged onto a board that is on screen, it travels in the
 * drag data under SNIPPET_MIME. Sent with "Send to a board…", it waits here until that board has opened and taken it.
 */
export const SNIPPET_MIME = "application/x-orbit-snippet";

export function carriesSnippet(dataTransfer: DataTransfer | null): boolean {
  return dataTransfer !== null && Array.from(dataTransfer.types).includes(SNIPPET_MIME);
}

let pending: { boardId: number; text: string } | null = null;
const listeners = new Set<() => void>();

export function queueSnippet(boardId: number, text: string): void {
  pending = { boardId, text };
  listeners.forEach((listener) => listener());
}

/** The text waiting for this board, removed so it is placed once. */
export function takeSnippet(boardId: number): string | null {
  if (pending?.boardId !== boardId) return null;
  const { text } = pending;
  pending = null;
  return text;
}

export function subscribeSnippets(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
