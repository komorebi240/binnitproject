import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/taskApi";
import type { CreateTaskInput } from "../types";

const TASKS_KEY = ["tasks"] as const;

export function useTasksList() {
  return useQuery({ queryKey: TASKS_KEY, queryFn: api.listTasks });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.createTask(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

function useTaskAction(mutationFn: (id: number) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useAcceptTask() {
  return useTaskAction(api.acceptTask);
}

export function useDeclineTask() {
  return useTaskAction(api.declineTask);
}

export function useCompleteTask() {
  return useTaskAction(api.completeTask);
}

export function useCancelTask() {
  return useTaskAction(api.cancelTask);
}

export function useRestoreTask() {
  return useTaskAction(api.restoreTask);
}

export function useDeleteTask() {
  return useTaskAction(api.deleteTask);
}

export function useAddTaskAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, file }: { taskId: number; file: File }) => api.addTaskAttachment(taskId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useRemoveTaskAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, attachmentId }: { taskId: number; attachmentId: number }) =>
      api.removeTaskAttachment(taskId, attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useUpdateTaskDriveUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, driveUrl }: { taskId: number; driveUrl: string }) => api.updateTaskDriveUrl(taskId, driveUrl),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}
