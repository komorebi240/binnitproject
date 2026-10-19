import { useQuery } from "@tanstack/react-query";
import { fetchAttachment } from "../api/fileApi";
import type { FileSource } from "../fileSources";

/** An attachment never changes once uploaded: fetched once per open tab, not by the app-wide 30-second refresh. */
export function useAttachmentFile(source: FileSource) {
  const key = source.kind === "chat" ? ["file", "chat", source.attachmentId] : ["file", "task", source.taskId, source.attachmentId];
  return useQuery({
    queryKey: key,
    queryFn: () => fetchAttachment(source),
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
