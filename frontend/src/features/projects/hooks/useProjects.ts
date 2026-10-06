import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as api from "../api/projectApi";
import type { CreateProjectInput, ProjectDetail } from "../types";

const PROJECTS_KEY = ["projects"] as const;
const projectKey = (id: number) => [...PROJECTS_KEY, id] as const;
const messagesKey = (id: number) => [...PROJECTS_KEY, id, "messages"] as const;
// Under the tasks key, so any task change (new task, accept, complete...) also refreshes a project's list.
const projectTasksKey = (id: number) => ["tasks", "project", id] as const;

// Polling, not a WebSocket - same trade-off as the 1-1 chat (CLAUDE.md section 29).
const CHAT_POLL_INTERVAL_MS = 8_000;

export function useProjects() {
  return useQuery({ queryKey: PROJECTS_KEY, queryFn: api.listProjects });
}

export function useProject(id: number) {
  return useQuery({ queryKey: projectKey(id), queryFn: () => api.getProject(id) });
}

export function useProjectTasks(id: number, enabled: boolean) {
  return useQuery({ queryKey: projectTasksKey(id), queryFn: () => api.listProjectTasks(id), enabled });
}

export function useProjectMessages(id: number, enabled: boolean) {
  return useQuery({
    queryKey: messagesKey(id),
    queryFn: () => api.listMessages(id),
    enabled,
    refetchInterval: CHAT_POLL_INTERVAL_MS,
  });
}

/** Every change answers with the project's fresh detail, so the detail cache is replaced and the list is refreshed. */
function refreshAfterChange(queryClient: QueryClient, id: number, detail: ProjectDetail) {
  queryClient.setQueryData(projectKey(id), detail);
  return queryClient.invalidateQueries({ queryKey: PROJECTS_KEY, exact: true });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.createProject(input),
    onSuccess: (detail) => refreshAfterChange(queryClient, detail.id, detail),
  });
}

export function useUpdateProject(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) => api.updateProject(id, input),
    onSuccess: (detail) => refreshAfterChange(queryClient, id, detail),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteProject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

export function useInviteDepartment(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ departmentId, note }: { departmentId: number; note?: string }) => api.inviteDepartment(id, departmentId, note),
    onSuccess: (detail) => refreshAfterChange(queryClient, id, detail),
  });
}

export function useRespondToInvitation(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ departmentId, accept }: { departmentId: number; accept: boolean }) =>
      api.respondToInvitation(id, departmentId, accept),
    onSuccess: (detail) => refreshAfterChange(queryClient, id, detail),
  });
}

export function useRemoveDepartment(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (departmentId: number) => api.removeDepartment(id, departmentId),
    onSuccess: (detail) => refreshAfterChange(queryClient, id, detail),
  });
}

export function useAddProjectMember(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => api.addMember(id, userId),
    onSuccess: (detail) => refreshAfterChange(queryClient, id, detail),
  });
}

export function useRemoveProjectMember(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => api.removeMember(id, userId),
    onSuccess: (detail) => refreshAfterChange(queryClient, id, detail),
  });
}

export function useLinkProjectFolder(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (catalogFolderId: number) => api.linkFolder(id, catalogFolderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKey(id), exact: true }),
  });
}

export function useUnlinkProjectFolder(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: number) => api.unlinkFolder(id, linkId),
    onSuccess: (detail) => refreshAfterChange(queryClient, id, detail),
  });
}

export function useSendProjectMessage(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.sendMessage(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messagesKey(id) }),
  });
}
