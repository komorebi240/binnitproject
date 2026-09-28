export interface DriveConnectionStatus {
  connected: boolean;
  googleEmail: string | null;
}

export interface CatalogFolder {
  id: number;
  departmentId: number;
  departmentName: string;
  googleFolderId: string;
  googleFolderName: string;
}

export type FolderRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface FolderAccessRequest {
  id: number;
  catalogFolderId: number;
  googleFolderName: string | null;
  ownerDepartmentId: number | null;
  ownerDepartmentName: string | null;
  requesterUserId: number;
  requesterUserName: string;
  requesterDepartmentId: number;
  requesterDepartmentName: string | null;
  status: FolderRequestStatus;
  decidedByUserId: number | null;
  decidedByUserName: string | null;
  decidedAt: string | null;
  note: string | null;
  createdAt: string;
}
