import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/messageApi";

const CONVERSATIONS_KEY = ["messages", "conversations"] as const;
const threadKey = (userId: number) => ["messages", "with", userId] as const;

// Polling, not a WebSocket — same trade-off as notifications (CLAUDE.md section 29).
const POLL_INTERVAL_MS = 10_000;

export function useConversations() {
  return useQuery({ queryKey: CONVERSATIONS_KEY, queryFn: api.listConversations, refetchInterval: POLL_INTERVAL_MS });
}

export function useThreadWith(userId: number | null) {
  return useQuery({
    queryKey: threadKey(userId ?? -1),
    queryFn: () => api.getThreadWith(userId as number),
    enabled: userId != null,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSendMessage(userId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.sendMessage(userId as number, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: threadKey(userId ?? -1) });
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}
