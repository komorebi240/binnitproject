import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/messageApi";

const CONVERSATIONS_KEY = ["messages", "conversations"] as const;
const conversationsKey = (archived: boolean) => [...CONVERSATIONS_KEY, { archived }] as const;
const threadKey = (userId: number) => ["messages", "with", userId] as const;

// Polling, not a WebSocket - same trade-off as notifications (CLAUDE.md section 29).
const POLL_INTERVAL_MS = 10_000;

export function useConversations(archived = false) {
  return useQuery({
    queryKey: conversationsKey(archived),
    queryFn: () => api.listConversations(archived),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useThreadWith(userId: number | null) {
  return useQuery({
    queryKey: threadKey(userId ?? -1),
    queryFn: () => api.getThreadWith(userId as number),
    enabled: userId != null,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

/** Text message or a file (+ optional caption), whichever the composer has. */
export function useSendMessage(userId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, file }: { body: string; file: File | null }) =>
      file ? api.sendAttachment(userId as number, file, body) : api.sendMessage(userId as number, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: threadKey(userId ?? -1) });
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useRecallMessage(userId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: number) => api.recallMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: threadKey(userId ?? -1) });
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useSetConversationArchived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, archived }: { userId: number; archived: boolean }) =>
      archived ? api.archiveConversation(userId) : api.unarchiveConversation(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY }),
  });
}

export function useBroadcastMessage() {
  return useMutation({
    mutationFn: (body: string) => api.broadcastMessage(body),
  });
}
