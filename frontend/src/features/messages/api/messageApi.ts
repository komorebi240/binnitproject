import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { Conversation, Message } from "../types";

export async function listConversations(): Promise<Conversation[]> {
  const { data } = await apiClient.get<ApiResponse<Conversation[]>>("/messages/conversations");
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
