import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AUTH_ME_QUERY_KEY } from "@/features/auth/hooks/useAuth";
import { useI18n } from "@/lib/i18n/useI18n";
import * as api from "../api/termsApi";

/** The newest terms in the language of the interface; public, so it works before an account exists. */
export function useCurrentTerms() {
  const { locale } = useI18n();
  return useQuery({ queryKey: ["terms", "current", locale], queryFn: () => api.getCurrentTerms(locale), staleTime: 10 * 60_000 });
}

export function useAcceptTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => api.acceptTerms(version),
    // The profile says whether the terms window must be shown; it is re-read so the app opens right away.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
  });
}
