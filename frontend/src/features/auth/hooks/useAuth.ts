import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { forgotPassword, getCurrentUser, login, logout, resetPassword, updatePresence, uploadAvatar } from "../api/authApi";
import { resetClientSession } from "@/lib/session";
import type { LoginInput, PresenceStatus, ResetPasswordInput } from "../types";

export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

/** Source of truth for "am I logged in, and as whom" - bootstraps every protected page. */
export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: getCurrentUser,
    staleTime: 5 * 60_000,
    retry: false, // a 401 here means "not logged in", not a transient failure worth retrying
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (profile) => {
      // A different account may have used this browser before - start from a clean slate.
      resetClientSession(queryClient);
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, profile);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => resetClientSession(queryClient),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (username: string) => forgotPassword(username),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => resetPassword(input),
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    // invalidateQueries (refetch), not setQueryData - matches every other mutation in this
    // codebase (e.g. useNotifications); setQueryData here was observed to update the cache
    // correctly (confirmed via a direct fetch) but NOT re-render an already-mounted useQuery
    // consumer, only showing the new value after a full remount.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
  });
}

export function useUpdatePresence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: PresenceStatus) => updatePresence(status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
  });
}
