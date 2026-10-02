import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { UserProfile } from "@/features/auth/types";
import type { ChangePasswordInput, UpdateProfileInput } from "../types";

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await apiClient.patch("/auth/password", input);
}

export async function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
  const { data } = await apiClient.patch<ApiResponse<UserProfile>>("/auth/me", input);
  return data.data as UserProfile;
}
