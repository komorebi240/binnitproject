import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/notificationApi";

const LIST_KEY = ["notifications"] as const;
const UNREAD_COUNT_KEY = ["notifications", "unread-count"] as const;

// Polling, not a WebSocket — simple and enough at this scale (CLAUDE.md section 29: no new
// real-time infra until something actually needs it).
const POLL_INTERVAL_MS = 30_000;

export function useNotifications() {
  return useQuery({ queryKey: LIST_KEY, queryFn: api.listNotifications, refetchInterval: POLL_INTERVAL_MS });
}

export function useUnreadCount() {
  return useQuery({ queryKey: UNREAD_COUNT_KEY, queryFn: api.getUnreadCount, refetchInterval: POLL_INTERVAL_MS });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
    queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
  };
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: number) => api.markRead(id),
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: api.markAllRead,
    onSuccess: invalidate,
  });
}
