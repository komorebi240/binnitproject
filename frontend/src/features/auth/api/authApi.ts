import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { LoginInput, UserProfile } from "../types";

export async function login(input: LoginInput): Promise<UserProfile> {
  const { data } = await apiClient.post<ApiResponse<UserProfile>>("/auth/login", input);
  return data.data as UserProfile;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function getCurrentUser(): Promise<UserProfile> {
  const { data } = await apiClient.get<ApiResponse<UserProfile>>("/auth/me");
  return data.data as UserProfile;
}
