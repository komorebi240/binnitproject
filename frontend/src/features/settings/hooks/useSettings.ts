import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/settingsApi";
import { AUTH_ME_QUERY_KEY } from "@/features/auth/hooks/useAuth";
import type { ChangePasswordInput, UpdateProfileInput } from "../types";

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => api.changePassword(input),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.updateProfile(input),
    onSuccess: (profile) => queryClient.setQueryData(AUTH_ME_QUERY_KEY, profile),
  });
}
