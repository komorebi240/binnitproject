import type { AuthorityLevel, PresenceStatus } from "@/features/auth/types";

export type ProjectDepartmentRole = "OWNER" | "SUPPORT";
export type ProjectInviteStatus = "INVITED" | "ACCEPTED" | "DECLINED";

export interface ProjectSummary {
  id: number;
  name: string;
  description: string | null;
  ownerDepartmentId: number;
  ownerDepartmentName: string | null;
  memberCount: number;
  supportDepartmentCount: number;
  member: boolean;
  /** A department the caller answers for has an open invitation to this project. */
  invitationWaiting: boolean;
}

export interface ProjectDepartment {
  departmentId: number;
  departmentName: string | null;
  role: ProjectDepartmentRole;
  status: ProjectInviteStatus;
  note: string | null;
  decidedAt: string | null;
  memberCount: number;
}

export interface ProjectMember {
  userId: number;
  fullName: string;
  title: string | null;
  email: string | null;
  departmentId: number | null;
  departmentName: string | null;
  authorityLevel: AuthorityLevel;
  avatarUrl: string | null;
  presenceStatus: PresenceStatus;
}

export interface ProjectFolder {
  id: number;
  catalogFolderId: number;
  folderName: string;
  departmentId: number;
  departmentName: string | null;
  googleFolderId: string;
}

export interface ProjectDetail {
  id: number;
  name: string;
  description: string | null;
  ownerDepartmentId: number;
  ownerDepartmentName: string | null;
  departments: ProjectDepartment[];
  members: ProjectMember[];
  folders: ProjectFolder[];
  /** The server's hints about what this caller may do; every action is checked there again. */
  canManage: boolean;
  member: boolean;
  canWork: boolean;
  respondableDepartmentIds: number[];
  memberManageableDepartmentIds: number[];
}

export interface FolderShareResult {
  granted: number;
  notConnected: number;
  failed: number;
}

export interface ProjectFolderLink {
  folder: ProjectFolder;
  share: FolderShareResult;
}

export interface ProjectMessage {
  id: number;
  senderId: number;
  senderName: string | null;
  senderAvatarUrl: string | null;
  body: string;
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  ownerDepartmentId?: number;
  supportDepartmentIds?: number[];
  inviteNote?: string;
}

export const MAX_PROJECT_MESSAGE_LENGTH = 2000;
