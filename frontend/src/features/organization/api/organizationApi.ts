import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { CreateUserInput, Department, Team, UserSummary } from "../types";

export async function listDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get<ApiResponse<Department[]>>("/departments");
  return data.data as Department[];
}

export async function createDepartment(name: string): Promise<Department> {
  const { data } = await apiClient.post<ApiResponse<Department>>("/departments", { name });
  return data.data as Department;
}

export async function deleteDepartment(id: number): Promise<void> {
  await apiClient.delete(`/departments/${id}`);
}

export async function listTeams(departmentId: number): Promise<Team[]> {
  const { data } = await apiClient.get<ApiResponse<Team[]>>(`/departments/${departmentId}/teams`);
  return data.data as Team[];
}

export async function createTeam(departmentId: number, name: string): Promise<Team> {
  const { data } = await apiClient.post<ApiResponse<Team>>(`/departments/${departmentId}/teams`, { name });
  return data.data as Team;
}

export async function deleteTeam(id: number): Promise<void> {
  await apiClient.delete(`/teams/${id}`);
}

export async function listUsers(): Promise<UserSummary[]> {
  const { data } = await apiClient.get<ApiResponse<UserSummary[]>>("/users");
  return data.data as UserSummary[];
}

export async function createUser(input: CreateUserInput): Promise<UserSummary> {
  const { data } = await apiClient.post<ApiResponse<UserSummary>>("/users", input);
  return data.data as UserSummary;
}

export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
