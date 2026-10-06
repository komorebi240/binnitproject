import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { Task } from "@/features/tasks/types";
import type {
  CreateProjectInput,
  ProjectDetail,
  ProjectFolderLink,
  ProjectMessage,
  ProjectSummary,
} from "../types";

export async function listProjects(): Promise<ProjectSummary[]> {
  const { data } = await apiClient.get<ApiResponse<ProjectSummary[]>>("/projects");
  return data.data as ProjectSummary[];
}

export async function getProject(id: number): Promise<ProjectDetail> {
  const { data } = await apiClient.get<ApiResponse<ProjectDetail>>(`/projects/${id}`);
  return data.data as ProjectDetail;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectDetail> {
  const { data } = await apiClient.post<ApiResponse<ProjectDetail>>("/projects", input);
  return data.data as ProjectDetail;
}

export async function updateProject(id: number, input: { name: string; description?: string }): Promise<ProjectDetail> {
  const { data } = await apiClient.patch<ApiResponse<ProjectDetail>>(`/projects/${id}`, input);
  return data.data as ProjectDetail;
}

export async function deleteProject(id: number): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}

export async function inviteDepartment(id: number, departmentId: number, note?: string): Promise<ProjectDetail> {
  const { data } = await apiClient.post<ApiResponse<ProjectDetail>>(`/projects/${id}/departments`, { departmentId, note });
  return data.data as ProjectDetail;
}

export async function respondToInvitation(id: number, departmentId: number, accept: boolean): Promise<ProjectDetail> {
  const { data } = await apiClient.post<ApiResponse<ProjectDetail>>(
    `/projects/${id}/departments/${departmentId}/${accept ? "accept" : "decline"}`,
  );
  return data.data as ProjectDetail;
}

export async function removeDepartment(id: number, departmentId: number): Promise<ProjectDetail> {
  const { data } = await apiClient.delete<ApiResponse<ProjectDetail>>(`/projects/${id}/departments/${departmentId}`);
  return data.data as ProjectDetail;
}

export async function addMember(id: number, userId: number): Promise<ProjectDetail> {
  const { data } = await apiClient.post<ApiResponse<ProjectDetail>>(`/projects/${id}/members`, { userId });
  return data.data as ProjectDetail;
}

export async function removeMember(id: number, userId: number): Promise<ProjectDetail> {
  const { data } = await apiClient.delete<ApiResponse<ProjectDetail>>(`/projects/${id}/members/${userId}`);
  return data.data as ProjectDetail;
}

export async function linkFolder(id: number, catalogFolderId: number): Promise<ProjectFolderLink> {
  const { data } = await apiClient.post<ApiResponse<ProjectFolderLink>>(`/projects/${id}/folders`, { catalogFolderId });
  return data.data as ProjectFolderLink;
}

export async function unlinkFolder(id: number, linkId: number): Promise<ProjectDetail> {
  const { data } = await apiClient.delete<ApiResponse<ProjectDetail>>(`/projects/${id}/folders/${linkId}`);
  return data.data as ProjectDetail;
}

export async function listMessages(id: number): Promise<ProjectMessage[]> {
  const { data } = await apiClient.get<ApiResponse<ProjectMessage[]>>(`/projects/${id}/messages`);
  return data.data as ProjectMessage[];
}

export async function sendMessage(id: number, body: string): Promise<ProjectMessage> {
  const { data } = await apiClient.post<ApiResponse<ProjectMessage>>(`/projects/${id}/messages`, { body });
  return data.data as ProjectMessage;
}

export async function listProjectTasks(id: number): Promise<Task[]> {
  const { data } = await apiClient.get<ApiResponse<Task[]>>(`/tasks/project/${id}`);
  return data.data as Task[];
}
