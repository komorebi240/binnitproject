import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { Note, SaveNoteInput } from "../types";

export async function listNotes(): Promise<Note[]> {
  const { data } = await apiClient.get<ApiResponse<Note[]>>("/notes");
  return data.data as Note[];
}

export async function createNote(input: SaveNoteInput): Promise<Note> {
  const { data } = await apiClient.post<ApiResponse<Note>>("/notes", input);
  return data.data as Note;
}

export async function updateNote(id: number, input: SaveNoteInput): Promise<Note> {
  const { data } = await apiClient.patch<ApiResponse<Note>>(`/notes/${id}`, input);
  return data.data as Note;
}

export async function deleteNote(id: number): Promise<void> {
  await apiClient.delete(`/notes/${id}`);
}

export async function setPinned(id: number, pinned: boolean): Promise<Note> {
  const { data } = await apiClient.patch<ApiResponse<Note>>(`/notes/${id}/pin`, { pinned });
  return data.data as Note;
}
