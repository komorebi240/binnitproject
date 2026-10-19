import { apiClient } from "@/lib/api/client";
import type { FileSource } from "../fileSources";

export interface FetchedFile {
  bytes: ArrayBuffer;
  /** As the server decided it from the file's own bytes. */
  contentType: string | null;
}

/** The attachment's bytes, through the same endpoint (and so the same permission checks) as a download. */
export async function fetchAttachment(source: FileSource): Promise<FetchedFile> {
  const path =
    source.kind === "chat"
      ? `/messages/attachments/${source.attachmentId}?download=true`
      : `/tasks/${source.taskId}/attachments/${source.attachmentId}`;
  const response = await apiClient.get<ArrayBuffer>(path, { responseType: "arraybuffer" });
  const contentType = response.headers["content-type"];
  return { bytes: response.data, contentType: typeof contentType === "string" ? contentType : null };
}
