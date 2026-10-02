import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/calendarApi";
import type { CreateCalendarEventInput } from "../types";

const MY_EVENTS_KEY = ["calendar", "me"] as const;

export function useMyCalendarEvents() {
  return useQuery({ queryKey: MY_EVENTS_KEY, queryFn: api.listMyEvents });
}

export function useCreateOwnEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) => api.createOwnEvent(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
  });
}

export function useCreateEventForUser() {
  return useMutation({
    mutationFn: ({ userId, input }: { userId: number; input: CreateCalendarEventInput }) =>
      api.createEventForUser(userId, input),
  });
}

export function useAcceptEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.acceptEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
  });
}

export function useDeclineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.declineEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
  });
}
