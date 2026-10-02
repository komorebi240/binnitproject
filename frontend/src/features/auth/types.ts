export type AuthorityLevel = "EXECUTIVE" | "DEPARTMENT_HEAD" | "TEAM_LEAD" | "EMPLOYEE";

/** Self-reported, display-only — never suppresses real notifications (see backend PresenceStatus javadoc). */
export type PresenceStatus = "ONLINE" | "LIMITED" | "DO_NOT_DISTURB";

export interface UserProfile {
  userId: number;
  username: string;
  fullName: string;
  email: string | null;
  companyId: number;
  companyName: string;
  authorityLevel: AuthorityLevel;
  title: string | null;
  departmentId: number | null;
  departmentName: string | null;
  teamId: number | null;
  teamName: string | null;
  avatarUrl: string | null;
  presenceStatus: PresenceStatus;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface ResetPasswordInput {
  username: string;
  otp: string;
  newPassword: string;
}
