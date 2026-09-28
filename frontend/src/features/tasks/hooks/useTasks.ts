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
