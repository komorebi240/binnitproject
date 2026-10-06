import type { AuthorityLevel, PresenceStatus } from "@/features/auth/types";

export interface Department {
  id: number;
  name: string;
  description: string | null;
  companyId: number;
  /** Preset keys (see departmentAppearance.tsx); null = the default look. */
  color: string | null;
  icon: string | null;
}

export interface CreateDepartmentInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

/** Full replacement of the editable fields; leaving color/icon out resets them to the default look. */
export interface UpdateDepartmentInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface DepartmentMember {
  userId: number;
  fullName: string;
  title: string | null;
  email: string | null;
  authorityLevel: AuthorityLevel;
  avatarUrl: string | null;
  presenceStatus: PresenceStatus;
}

export interface Team {
  id: number;
  name: string;
  departmentId: number;
}

export interface UserSummary {
  id: number;
  username: string;
  fullName: string;
  authorityLevel: AuthorityLevel;
  title: string | null;
  departmentId: number | null;
  teamId: number | null;
  active: boolean;
  phone: string | null;
  employeeCode: string | null;
  startDate: string | null;
  avatarUrl: string | null;
  presenceStatus: PresenceStatus;
}

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  authorityLevel: AuthorityLevel;
  title?: string;
  departmentId?: number;
  teamId?: number;
  phone?: string;
  employeeCode?: string;
  startDate?: string;
}

export interface UpdatePositionInput {
  authorityLevel: AuthorityLevel;
  title?: string;
  departmentId?: number;
  teamId?: number;
}
