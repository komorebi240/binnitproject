import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { UserProfile } from "@/features/auth/types";
import type {
  AcceptInvitationInput,
  Company,
  CreateInvitationInput,
  Invitation,
  InvitationPreview,
  RegisterCompanyInput,
  UpdateCompanyInput,
} from "../types";

// ---- public: self-service registration
export async function requestRegistrationOtp(email: string): Promise<void> {
  await apiClient.post("/auth/register/request-otp", { email });
}

export async function verifyRegistrationOtp(email: string, otp: string): Promise<string> {
  const { data } = await apiClient.post<ApiResponse<{ verificationToken: string }>>("/auth/register/verify-otp", { email, otp });
  return (data.data as { verificationToken: string }).verificationToken;
}

export async function registerCompany(input: RegisterCompanyInput): Promise<UserProfile> {
  const { data } = await apiClient.post<ApiResponse<UserProfile>>("/auth/register", input);
  return data.data as UserProfile;
}

// ---- public: accepting an invitation
export async function getInvitationPreview(token: string): Promise<InvitationPreview> {
  const { data } = await apiClient.get<ApiResponse<InvitationPreview>>(`/auth/invitations/${encodeURIComponent(token)}`);
  return data.data as InvitationPreview;
}

export async function acceptInvitation(token: string, input: AcceptInvitationInput): Promise<UserProfile> {
  const { data } = await apiClient.post<ApiResponse<UserProfile>>(`/auth/invitations/${encodeURIComponent(token)}/accept`, input);
  return data.data as UserProfile;
}

// ---- managers: invitations
export async function listInvitations(): Promise<Invitation[]> {
  const { data } = await apiClient.get<ApiResponse<Invitation[]>>("/invitations");
  return data.data as Invitation[];
}

export async function createInvitation(input: CreateInvitationInput): Promise<Invitation> {
  const { data } = await apiClient.post<ApiResponse<Invitation>>("/invitations", input);
  return data.data as Invitation;
}

export async function revokeInvitation(id: number): Promise<void> {
  await apiClient.delete(`/invitations/${id}`);
}

export async function resendInvitation(id: number): Promise<Invitation> {
  const { data } = await apiClient.post<ApiResponse<Invitation>>(`/invitations/${id}/resend`);
  return data.data as Invitation;
}

// ---- company profile
export async function getCompany(): Promise<Company> {
  const { data } = await apiClient.get<ApiResponse<Company>>("/companies/me");
  return data.data as Company;
}

export async function updateCompany(input: UpdateCompanyInput): Promise<Company> {
  const { data } = await apiClient.patch<ApiResponse<Company>>("/companies/me", input);
  return data.data as Company;
}

export async function uploadCompanyLogo(file: File): Promise<Company> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<ApiResponse<Company>>("/companies/me/logo", form);
  return data.data as Company;
}

export async function uploadCompanyBanner(file: File): Promise<Company> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<ApiResponse<Company>>("/companies/me/banner", form);
  return data.data as Company;
}

// ---- first-run tour
export async function completeOnboarding(): Promise<UserProfile> {
  const { data } = await apiClient.post<ApiResponse<UserProfile>>("/auth/me/onboarding/complete");
  return data.data as UserProfile;
}
