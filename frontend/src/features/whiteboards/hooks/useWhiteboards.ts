import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/whiteboardApi";
import type { WhiteboardDetail, WhiteboardRole } from "../types";

/** How often an open board asks whether someone else saved. */
export const VERSION_POLL_MS = 3_000;

const LIST_KEY = ["whiteboards"] as const;
const boardKey = (id: number) => ["whiteboards", "board", id] as const;
const versionKey = (id: number) => ["whiteboards", "version", id] as const;

export function useWhiteboards() {
  return useQuery({ queryKey: LIST_KEY, queryFn: api.listWhiteboards });
}

/**
 * The board as it was when opened. After that the canvas owns the drawing and merges newer versions in itself
 * (useWhiteboardSync), so this query is never refetched behind its back - not even by the app-wide 30-second poll,
 * which would download the whole drawing for nothing.
 */
export function useWhiteboard(id: number) {
  return useQuery({
    queryKey: boardKey(id),
    queryFn: () => api.getWhiteboard(id),
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** Polled only while the board is on screen; a hidden tab or a background window costs nothing. */
export function useWhiteboardVersion(id: number, enabled: boolean) {
  return useQuery({
    queryKey: versionKey(id),
    queryFn: () => api.getWhiteboardVersion(id),
    enabled,
    refetchInterval: enabled ? VERSION_POLL_MS : false,
    refetchIntervalInBackground: false,
  });
}

export function useCreateWhiteboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => api.createWhiteboard(title),
    onSuccess: (board) => {
      queryClient.setQueryData(boardKey(board.id), board);
      return queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useRenameWhiteboard(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => api.renameWhiteboard(id, title),
    onSuccess: (summary) => {
      queryClient.setQueryData<WhiteboardDetail>(boardKey(id), (board) => (board ? { ...board, title: summary.title } : board));
      return queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDeleteWhiteboard(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteWhiteboard(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: boardKey(id) });
      queryClient.removeQueries({ queryKey: versionKey(id) });
      return queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useSetWhiteboardMember(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: WhiteboardRole }) => api.setWhiteboardMember(id, userId, role),
    onSuccess: (members) => {
      queryClient.setQueryData<WhiteboardDetail>(boardKey(id), (board) => (board ? { ...board, members } : board));
    },
  });
}

/** Removing someone (owner) or leaving a board shared with you. */
export function useRemoveWhiteboardMember(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => api.removeWhiteboardMember(id, userId),
    onSuccess: (_result, userId) => {
      queryClient.setQueryData<WhiteboardDetail>(boardKey(id), (board) =>
        board ? { ...board, members: board.members.filter((member) => member.userId !== userId) } : board,
      );
      return queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
