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

export async function sendAttachment(recipientUserId: number, file: File, body: string): Promise<Message> {
  const form = new FormData();
  form.append("recipientUserId", String(recipientUserId));
  if (body) form.append("body", body);
  form.append("file", file);
  const { data } = await apiClient.post<ApiResponse<Message>>("/messages/attachments", form);
  return data.data as Message;
}

export async function recallMessage(messageId: number): Promise<void> {
  await apiClient.delete(`/messages/${messageId}`);
}

export async function archiveConversation(userId: number): Promise<void> {
  await apiClient.put(`/messages/with/${userId}/archive`);
}

export async function unarchiveConversation(userId: number): Promise<void> {
  await apiClient.delete(`/messages/with/${userId}/archive`);
}

/** Fetched through axios (not a plain link) so the auth cookie rides along - see useAuthedBlobUrl. */
export async function downloadAttachment(attachmentId: number): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/messages/attachments/${attachmentId}`, { responseType: "blob" });
  return data;
}

/** System/broadcast accounts only - see backend MessageServiceImpl.broadcastMessage. Returns
 * how many recipients the message went to. */
export async function broadcastMessage(body: string): Promise<number> {
  const { data } = await apiClient.post<ApiResponse<number>>("/messages/broadcast", { body });
  return data.data as number;
}
