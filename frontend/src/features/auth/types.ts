export type AuthorityLevel = "EXECUTIVE" | "DEPARTMENT_HEAD" | "TEAM_LEAD" | "EMPLOYEE";

/** Self-reported, display-only - never suppresses real notifications (see backend PresenceStatus javadoc). */
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
  /** A flagged communications-bot account allowed to message anyone in any company - see
   * backend UserEntity.isSystemAccount javadoc. Gates the broadcast composer in Messages. */
  systemAccount: boolean;
  /** False until the first-run guided tour is finished or skipped. */
  onboardingCompleted: boolean;
  /** False until the person has accepted the newest terms of service; the app shows the terms instead of itself. */
  termsAccepted: boolean;
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
