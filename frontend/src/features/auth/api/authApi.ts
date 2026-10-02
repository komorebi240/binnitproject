import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { LoginInput, PresenceStatus, ResetPasswordInput, UserProfile } from "../types";

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

/** Always resolves the same way regardless of whether the username exists - see backend AuthController. */
export async function forgotPassword(username: string): Promise<void> {
  await apiClient.post("/auth/forgot-password", { username });
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  await apiClient.post("/auth/reset-password", input);
}

export async function uploadAvatar(file: File): Promise<UserProfile> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<ApiResponse<UserProfile>>("/auth/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data as UserProfile;
}

export async function updatePresence(status: PresenceStatus): Promise<UserProfile> {
  const { data } = await apiClient.patch<ApiResponse<UserProfile>>("/auth/me/presence", { status });
  return data.data as UserProfile;
}
