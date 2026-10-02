import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AUTH_ME_QUERY_KEY } from "@/features/auth/hooks/useAuth";
import { resetClientSession } from "@/lib/session";
import * as api from "../api/onboardingApi";
import type { AcceptInvitationInput, CreateInvitationInput, RegisterCompanyInput, UpdateCompanyInput } from "../types";

const INVITATIONS_KEY = ["invitations"] as const;
export const COMPANY_KEY = ["company", "me"] as const;

export function useRequestRegistrationOtp() {
  return useMutation({ mutationFn: (email: string) => api.requestRegistrationOtp(email) });
}

export function useVerifyRegistrationOtp() {
  return useMutation({ mutationFn: ({ email, otp }: { email: string; otp: string }) => api.verifyRegistrationOtp(email, otp) });
}

/** Registering signs the new admin in (session cookie), so the profile goes straight into the auth cache. */
export function useRegisterCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterCompanyInput) => api.registerCompany(input),
    onSuccess: (profile) => {
      resetClientSession(queryClient);
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, profile);
    },
  });
}

export function useInvitationPreview(token: string) {
  return useQuery({ queryKey: ["invitation-preview", token], queryFn: () => api.getInvitationPreview(token), retry: false });
}

export function useAcceptInvitation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AcceptInvitationInput) => api.acceptInvitation(token, input),
    onSuccess: (profile) => {
      resetClientSession(queryClient);
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, profile);
    },
  });
}

export function useInvitations(enabled: boolean) {
  return useQuery({ queryKey: INVITATIONS_KEY, queryFn: api.listInvitations, enabled });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvitationInput) => api.createInvitation(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY }),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.revokeInvitation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY }),
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.resendInvitation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY }),
  });
}

export function useCompany() {
  return useQuery({ queryKey: COMPANY_KEY, queryFn: api.getCompany });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCompanyInput) => api.updateCompany(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_KEY });
      queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
    },
  });
}

export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadCompanyLogo(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COMPANY_KEY }),
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.completeOnboarding,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
  });
}
