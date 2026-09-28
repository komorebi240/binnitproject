import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { CatalogFolder, DriveConnectionStatus, FolderAccessRequest } from "../types";

export async function getConnectionStatus(): Promise<DriveConnectionStatus> {
  const { data } = await apiClient.get<ApiResponse<DriveConnectionStatus>>("/drive/status");
  return data.data as DriveConnectionStatus;
}

export async function listCatalog(): Promise<CatalogFolder[]> {
  const { data } = await apiClient.get<ApiResponse<CatalogFolder[]>>("/drive/catalog");
  return data.data as CatalogFolder[];
}

export async function registerFolder(input: { folderLinkOrId: string; departmentId?: number }): Promise<CatalogFolder> {
  const { data } = await apiClient.post<ApiResponse<CatalogFolder>>("/drive/catalog", input);
  return data.data as CatalogFolder;
}

export async function listAccessRequests(): Promise<FolderAccessRequest[]> {
  const { data } = await apiClient.get<ApiResponse<FolderAccessRequest[]>>("/drive/access-requests");
  return data.data as FolderAccessRequest[];
}

export async function createAccessRequest(input: { catalogFolderId: number; note?: string }): Promise<FolderAccessRequest> {
  const { data } = await apiClient.post<ApiResponse<FolderAccessRequest>>("/drive/access-requests", input);
  return data.data as FolderAccessRequest;
}

export async function approveAccessRequest(id: number): Promise<FolderAccessRequest> {
  const { data } = await apiClient.post<ApiResponse<FolderAccessRequest>>(`/drive/access-requests/${id}/approve`);
  return data.data as FolderAccessRequest;
}

export async function rejectAccessRequest(id: number): Promise<FolderAccessRequest> {
  const { data } = await apiClient.post<ApiResponse<FolderAccessRequest>>(`/drive/access-requests/${id}/reject`);
  return data.data as FolderAccessRequest;
}
