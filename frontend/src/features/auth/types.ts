export type AuthorityLevel = "EXECUTIVE" | "DEPARTMENT_HEAD" | "TEAM_LEAD" | "EMPLOYEE";

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
}

export interface LoginInput {
  username: string;
  password: string;
}
