import type { AuthorityLevel } from "@/features/auth/types";

export interface Company {
  id: number;
  name: string;
  contactEmail: string | null;
  /** Same-origin API path (null when no logo is set). */
  logoUrl: string | null;
}

export interface Invitation {
  id: number;
  email: string;
  authorityLevel: AuthorityLevel;
  departmentId: number | null;
  departmentName: string | null;
  teamId: number | null;
  teamName: string | null;
  title: string | null;
  invitedByName: string | null;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
}

export interface InvitationPreview {
  email: string;
  companyName: string;
  authorityLevel: AuthorityLevel;
  inviterName: string;
}

export interface CreateInvitationInput {
  email: string;
  authorityLevel: AuthorityLevel;
  departmentId?: number;
  teamId?: number;
  title?: string;
}

export interface RegisterCompanyInput {
  verificationToken: string;
  companyName: string;
  contactEmail?: string;
  username: string;
  fullName: string;
  password: string;
}

export interface AcceptInvitationInput {
  username: string;
  fullName: string;
  password: string;
}

export interface UpdateCompanyInput {
  name: string;
  contactEmail?: string;
}

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";

export const LEVEL_LABELS: Record<AuthorityLevel, string> = {
  EXECUTIVE: "Điều hành (CEO/CTO/COO...)",
  DEPARTMENT_HEAD: "Trưởng phòng",
  TEAM_LEAD: "Trưởng nhóm",
  EMPLOYEE: "Nhân viên",
};
