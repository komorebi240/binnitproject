import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { Conversation, Message } from "../types";

export async function listConversations(archived: boolean): Promise<Conversation[]> {
  const { data } = await apiClient.get<ApiResponse<Conversation[]>>("/messages/conversations", { params: { archived } });
  return data.data as Conversation[];
}

export async function getThreadWith(userId: number): Promise<Message[]> {
  const { data } = await apiClient.get<ApiResponse<Message[]>>(`/messages/with/${userId}`);
  return data.data as Message[];
}

export async function sendMessage(recipientUserId: number, body: string): Promise<Message> {
  const { data } = await apiClient.post<ApiResponse<Message>>("/messages", { recipientUserId, body });
  return data.data as Message;
}

/** `onProgress` gets 0-100 while the file uploads (a 50 MB video takes a while). */
export async function sendAttachment(
  recipientUserId: number,
  file: File,
  body: string,
  onProgress?: (percent: number) => void,
): Promise<Message> {
  const form = new FormData();
  form.append("recipientUserId", String(recipientUserId));
  if (body) form.append("body", body);
  form.append("file", file);
  const { data } = await apiClient.post<ApiResponse<Message>>("/messages/attachments", form, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return data.data as Message;
}

/** Recall: removes the message for both sides (sender only). */
export async function recallMessage(messageId: number): Promise<void> {
  await apiClient.delete(`/messages/${messageId}`);
}

/** "Delete for me": only the caller stops seeing the message. */
export async function hideMessage(messageId: number): Promise<void> {
  await apiClient.delete(`/messages/${messageId}/for-me`);
}

/** Returns how many people received a copy. */
export async function forwardMessage(messageId: number, recipientUserIds: number[]): Promise<number> {
  const { data } = await apiClient.post<ApiResponse<number>>(`/messages/${messageId}/forward`, { recipientUserIds });
  return data.data as number;
}

/**
 * Address of an attachment for an <img>/<video> or a download link. The API is served from this site's own origin
 * (/api/v1, see next.config), so the session cookie rides along without fetching the bytes into a blob first - which a
 * video needs, because the player fetches it in byte ranges while it plays.
 */
export function attachmentUrl(attachmentId: number, { download = false }: { download?: boolean } = {}): string {
  const base = apiClient.defaults.baseURL ?? "/api/v1";
  return `${base}/messages/attachments/${attachmentId}${download ? "?download=true" : ""}`;
}

export async function archiveConversation(userId: number): Promise<void> {
  await apiClient.put(`/messages/with/${userId}/archive`);
}

export async function unarchiveConversation(userId: number): Promise<void> {
  await apiClient.delete(`/messages/with/${userId}/archive`);
}

/** System/broadcast accounts only - see backend MessageServiceImpl.broadcastMessage. Returns
 * how many recipients the message went to. */
export async function broadcastMessage(body: string): Promise<number> {
  const { data } = await apiClient.post<ApiResponse<number>>("/messages/broadcast", { body });
  return data.data as number;
}
