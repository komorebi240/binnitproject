import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { Notification } from "../types";

export async function listNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<ApiResponse<Notification[]>>("/notifications");
  return data.data as Notification[];
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<ApiResponse<{ count: number }>>("/notifications/unread-count");
  return (data.data as { count: number }).count;
}

export async function markRead(id: number): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  await apiClient.patch("/notifications/read-all");
}
