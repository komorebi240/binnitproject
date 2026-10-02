import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/noteApi";
import type { SaveNoteInput } from "../types";

const NOTES_KEY = ["notes"] as const;

export function useNotes() {
  return useQuery({ queryKey: NOTES_KEY, queryFn: api.listNotes });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveNoteInput) => api.createNote(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTES_KEY }),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: SaveNoteInput }) => api.updateNote(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTES_KEY }),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteNote(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTES_KEY }),
  });
}

export function useSetNotePinned() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pinned }: { id: number; pinned: boolean }) => api.setPinned(id, pinned),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTES_KEY }),
  });
}
