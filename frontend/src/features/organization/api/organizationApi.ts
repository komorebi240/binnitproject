import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type {
  CreateDepartmentInput,
  CreateUserInput,
  Department,
  DepartmentMember,
  Team,
  UpdateDepartmentInput,
  UpdatePositionInput,
  UserSummary,
} from "../types";

export async function listDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get<ApiResponse<Department[]>>("/departments");
  return data.data as Department[];
}

export async function createDepartment(input: CreateDepartmentInput): Promise<Department> {
  const { data } = await apiClient.post<ApiResponse<Department>>("/departments", input);
  return data.data as Department;
}

export async function updateDepartment(id: number, input: UpdateDepartmentInput): Promise<Department> {
  const { data } = await apiClient.patch<ApiResponse<Department>>(`/departments/${id}`, input);
  return data.data as Department;
}

/** Emails the staff member a password-reset code; they choose their own new password. */
export async function sendStaffPasswordReset(userId: number): Promise<void> {
  await apiClient.post(`/users/${userId}/password-reset`);
}

/** Sends a confirmation code to the NEW address; the email only changes after the code is confirmed. */
export async function requestStaffEmailChange(userId: number, email: string): Promise<void> {
  await apiClient.post(`/users/${userId}/email-change`, { email });
}

export async function confirmStaffEmailChange(userId: number, otp: string): Promise<UserSummary> {
  const { data } = await apiClient.post<ApiResponse<UserSummary>>(`/users/${userId}/email-change/confirm`, { otp });
  return data.data as UserSummary;
}

export async function deleteDepartment(id: number): Promise<void> {
  await apiClient.delete(`/departments/${id}`);
}

export async function listDepartmentMembers(departmentId: number): Promise<DepartmentMember[]> {
  const { data } = await apiClient.get<ApiResponse<DepartmentMember[]>>(`/departments/${departmentId}/members`);
  return data.data as DepartmentMember[];
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

export async function listTeamMembers(teamId: number): Promise<DepartmentMember[]> {
  const { data } = await apiClient.get<ApiResponse<DepartmentMember[]>>(`/teams/${teamId}/members`);
  return data.data as DepartmentMember[];
}

export async function listUsers(): Promise<UserSummary[]> {
  const { data } = await apiClient.get<ApiResponse<UserSummary[]>>("/users");
  return data.data as UserSummary[];
}

export async function createUser(input: CreateUserInput): Promise<UserSummary> {
  const { data } = await apiClient.post<ApiResponse<UserSummary>>("/users", input);
  return data.data as UserSummary;
}

/** The caller's own password travels in the body: the server re-authenticates before deleting. */
export async function deleteUser(id: number, password: string): Promise<void> {
  await apiClient.delete(`/users/${id}`, { data: { password } });
}

export async function updatePosition(id: number, input: UpdatePositionInput): Promise<UserSummary> {
  const { data } = await apiClient.patch<ApiResponse<UserSummary>>(`/users/${id}/position`, input);
  return data.data as UserSummary;
}

export async function setUserActive(id: number, active: boolean): Promise<UserSummary> {
  const { data } = await apiClient.patch<ApiResponse<UserSummary>>(`/users/${id}/status`, { active });
  return data.data as UserSummary;
}
