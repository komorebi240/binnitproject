import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/organizationApi";
import type { CreateDepartmentInput, CreateUserInput, UpdatePositionInput } from "../types";

const DEPARTMENTS_KEY = ["departments"] as const;
const USERS_KEY = ["users"] as const;
const teamsKey = (departmentId: number) => ["departments", departmentId, "teams"] as const;
const departmentMembersKey = (departmentId: number) => ["departments", departmentId, "members"] as const;
const teamMembersKey = (teamId: number) => ["teams", teamId, "members"] as const;

export function useDepartments() {
  return useQuery({ queryKey: DEPARTMENTS_KEY, queryFn: api.listDepartments });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepartmentInput) => api.createDepartment(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEPARTMENTS_KEY }),
  });
}

export function useDepartmentMembers(departmentId: number) {
  return useQuery({
    queryKey: departmentMembersKey(departmentId),
    queryFn: () => api.listDepartmentMembers(departmentId),
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteDepartment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEPARTMENTS_KEY }),
  });
}

export function useTeams(departmentId: number) {
  return useQuery({
    queryKey: teamsKey(departmentId),
    queryFn: () => api.listTeams(departmentId),
  });
}

export function useCreateTeam(departmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createTeam(departmentId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamsKey(departmentId) }),
  });
}

export function useDeleteTeam(departmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteTeam(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamsKey(departmentId) }),
  });
}

export function useTeamMembers(teamId: number) {
  return useQuery({
    queryKey: teamMembersKey(teamId),
    queryFn: () => api.listTeamMembers(teamId),
  });
}

export function useUsers() {
  return useQuery({ queryKey: USERS_KEY, queryFn: api.listUsers });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.createUser(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => api.deleteUser(id, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdatePositionInput }) => api.updatePosition(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => api.setUserActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}
