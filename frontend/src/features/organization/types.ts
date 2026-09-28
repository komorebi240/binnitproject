import type { AuthorityLevel } from "@/features/auth/types";

export interface Department {
  id: number;
  name: string;
  companyId: number;
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
}
