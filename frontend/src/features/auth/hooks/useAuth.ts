import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, login, logout } from "../api/authApi";
import type { LoginInput } from "../types";

export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

/** Source of truth for "am I logged in, and as whom" — bootstraps every protected page. */
export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: getCurrentUser,
    retry: false, // a 401 here means "not logged in", not a transient failure worth retrying
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, profile);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: AUTH_ME_QUERY_KEY });
    },
  });
}
