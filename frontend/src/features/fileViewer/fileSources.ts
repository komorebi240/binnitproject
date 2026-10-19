/**
 * Where a viewed file comes from. Only attachments the server already lets the user download can be opened: the viewer
 * fetches them through the same endpoints, so the same permission checks apply.
 */
export type FileSource = { kind: "chat"; attachmentId: number } | { kind: "task"; taskId: number; attachmentId: number };

export type PreviewKind = "pdf" | "docx" | "xlsx" | "csv" | "text";

const KIND_BY_TYPE: Record<string, PreviewKind> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
  "text/plain": "text",
};

const KIND_BY_EXTENSION: Record<string, PreviewKind> = {
  pdf: "pdf",
  docx: "docx",
  xlsx: "xlsx",
  csv: "csv",
  txt: "text",
};

/**
 * How a file can be shown in a tab, or null when it can only be downloaded (legacy .doc/.xls/.ppt, .pptx, archives).
 * The content type the server decided (from the file's bytes) wins over the name.
 */
export function previewKind(fileName: string, contentType?: string | null): PreviewKind | null {
  const type = contentType?.split(";")[0]?.trim().toLowerCase();
  if (type && type in KIND_BY_TYPE) return KIND_BY_TYPE[type] ?? null;
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined;
  return (extension && KIND_BY_EXTENSION[extension]) || null;
}

/** The tab path that opens a file (the name rides along for the title; it is never the URL bar). */
export function fileViewerPath(source: FileSource, fileName: string): string {
  const query = `?name=${encodeURIComponent(fileName)}`;
  return source.kind === "chat"
    ? `/dashboard/files/chat/${source.attachmentId}${query}`
    : `/dashboard/files/task/${source.taskId}/${source.attachmentId}${query}`;
}

/** The reverse of fileViewerPath; null for anything else. */
export function parseFileViewerPath(pathname: string): FileSource | null {
  const chat = pathname.match(/^\/dashboard\/files\/chat\/(\d+)$/);
  if (chat) return { kind: "chat", attachmentId: Number(chat[1]) };
  const task = pathname.match(/^\/dashboard\/files\/task\/(\d+)\/(\d+)$/);
  if (task) return { kind: "task", taskId: Number(task[1]), attachmentId: Number(task[2]) };
  return null;
}
