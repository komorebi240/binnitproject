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
