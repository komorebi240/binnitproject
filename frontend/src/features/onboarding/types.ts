import type { AuthorityLevel } from "@/features/auth/types";
import type { TranslationKey } from "@/lib/i18n/dictionary";

export interface Company {
  id: number;
  name: string;
  contactEmail: string | null;
  description: string | null;
  /** Same-origin API path (null when no logo is set). */
  logoUrl: string | null;
  /** Same-origin API path (null when no banner is set). */
  bannerUrl: string | null;
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
  /** The version of the terms the person has just read and accepted. */
  acceptedTermsVersion: number;
}

export interface AcceptInvitationInput {
  username: string;
  fullName: string;
  password: string;
  acceptedTermsVersion: number;
}

export interface UpdateCompanyInput {
  name: string;
  contactEmail?: string;
  /** Replaces the stored text; leave out (or blank) to clear it. */
  description?: string;
}

/** Limits for the company logo and banner (the backend enforces the same ones). */
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";

/** Message keys for an authority level: the long form for pickers, the short form for lists and badges. */
export const LEVEL_LABEL_KEYS: Record<AuthorityLevel, TranslationKey> = {
  EXECUTIVE: "common.executiveCeoCtoCoo",
  DEPARTMENT_HEAD: "common.departmentHead",
  TEAM_LEAD: "common.teamLead",
  EMPLOYEE: "common.employee",
};

export const LEVEL_SHORT_LABEL_KEYS: Record<AuthorityLevel, TranslationKey> = {
  ...LEVEL_LABEL_KEYS,
  EXECUTIVE: "common.executive",
};
