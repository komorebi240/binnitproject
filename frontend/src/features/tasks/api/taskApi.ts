import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { CreateTaskInput, Task } from "../types";

export async function listTasks(): Promise<Task[]> {
  const { data } = await apiClient.get<ApiResponse<Task[]>>("/tasks");
  return data.data as Task[];
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data } = await apiClient.post<ApiResponse<Task>>("/tasks", input);
  return data.data as Task;
}

export async function acceptTask(id: number): Promise<Task> {
  const { data } = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/accept`);
  return data.data as Task;
}

export async function declineTask(id: number): Promise<Task> {
  const { data } = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/decline`);
  return data.data as Task;
}

export async function completeTask(id: number): Promise<Task> {
  const { data } = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/complete`);
  return data.data as Task;
}

export async function cancelTask(id: number): Promise<Task> {
  const { data } = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/cancel`);
  return data.data as Task;
}

export async function restoreTask(id: number): Promise<Task> {
  const { data } = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/restore`);
  return data.data as Task;
}

export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/tasks/${id}`);
}

/** "Clear all": hides these finished tasks from the user's own lists; returns the ids actually hidden. */
export async function hideTasks(taskIds: number[]): Promise<number[]> {
  const { data } = await apiClient.post<ApiResponse<{ taskIds: number[] }>>("/tasks/hidden", { taskIds });
  return (data.data as { taskIds: number[] }).taskIds;
}

export async function unhideTasks(taskIds: number[]): Promise<void> {
  await apiClient.post("/tasks/hidden/undo", { taskIds });
}

export async function addTaskAttachment(taskId: number, file: File): Promise<Task> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<ApiResponse<Task>>(`/tasks/${taskId}/attachments`, form);
  return data.data as Task;
}

export async function removeTaskAttachment(taskId: number, attachmentId: number): Promise<Task> {
  const { data } = await apiClient.delete<ApiResponse<Task>>(`/tasks/${taskId}/attachments/${attachmentId}`);
  return data.data as Task;
}

export async function addChecklistItem(taskId: number, text: string): Promise<Task> {
  const { data } = await apiClient.post<ApiResponse<Task>>(`/tasks/${taskId}/checklist`, { text });
  return data.data as Task;
}

/** Ticking the last open item completes the task on the server. */
export async function setChecklistItemDone(taskId: number, itemId: number, done: boolean): Promise<Task> {
  const { data } = await apiClient.patch<ApiResponse<Task>>(`/tasks/${taskId}/checklist/${itemId}`, { done });
  return data.data as Task;
}

export async function removeChecklistItem(taskId: number, itemId: number): Promise<Task> {
  const { data } = await apiClient.delete<ApiResponse<Task>>(`/tasks/${taskId}/checklist/${itemId}`);
  return data.data as Task;
}

/** Fetched through axios (not a plain link) so the auth cookie rides along - see useAuthedBlobUrl. */
export async function downloadTaskAttachment(taskId: number, attachmentId: number): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/tasks/${taskId}/attachments/${attachmentId}`, { responseType: "blob" });
  return data;
}

/** A blank link clears it. */
export async function updateTaskDriveUrl(taskId: number, driveUrl: string): Promise<Task> {
  const { data } = await apiClient.patch<ApiResponse<Task>>(`/tasks/${taskId}/drive-url`, { driveUrl });
  return data.data as Task;
}
