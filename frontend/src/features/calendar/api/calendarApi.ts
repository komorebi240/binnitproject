import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { CalendarEvent, CreateCalendarEventInput } from "../types";

export async function listMyEvents(): Promise<CalendarEvent[]> {
  const { data } = await apiClient.get<ApiResponse<CalendarEvent[]>>("/calendar/me");
  return data.data as CalendarEvent[];
}

export async function createOwnEvent(input: CreateCalendarEventInput): Promise<CalendarEvent> {
  const { data } = await apiClient.post<ApiResponse<CalendarEvent>>("/calendar/me", input);
  return data.data as CalendarEvent;
}

export async function createEventForUser(userId: number, input: CreateCalendarEventInput): Promise<CalendarEvent> {
  const { data } = await apiClient.post<ApiResponse<CalendarEvent>>(`/calendar/users/${userId}`, input);
  return data.data as CalendarEvent;
}

export async function acceptEvent(id: number): Promise<CalendarEvent> {
  const { data } = await apiClient.patch<ApiResponse<CalendarEvent>>(`/calendar/${id}/accept`);
  return data.data as CalendarEvent;
}

export async function declineEvent(id: number): Promise<CalendarEvent> {
  const { data } = await apiClient.patch<ApiResponse<CalendarEvent>>(`/calendar/${id}/decline`);
  return data.data as CalendarEvent;
}

export async function deleteEvent(id: number): Promise<void> {
  await apiClient.delete(`/calendar/${id}`);
}
