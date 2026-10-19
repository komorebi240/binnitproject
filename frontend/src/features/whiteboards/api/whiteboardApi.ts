import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type {
  StoredElement,
  WhiteboardDetail,
  WhiteboardMember,
  WhiteboardRole,
  WhiteboardSummary,
  WhiteboardVersion,
} from "../types";

export async function listWhiteboards(): Promise<WhiteboardSummary[]> {
  const { data } = await apiClient.get<ApiResponse<WhiteboardSummary[]>>("/whiteboards");
  return data.data as WhiteboardSummary[];
}

export async function createWhiteboard(title: string): Promise<WhiteboardDetail> {
  const { data } = await apiClient.post<ApiResponse<WhiteboardDetail>>("/whiteboards", { title });
  return data.data as WhiteboardDetail;
}

export async function getWhiteboard(id: number): Promise<WhiteboardDetail> {
  const { data } = await apiClient.get<ApiResponse<WhiteboardDetail>>(`/whiteboards/${id}`);
  return data.data as WhiteboardDetail;
}

export async function getWhiteboardVersion(id: number): Promise<WhiteboardVersion> {
  const { data } = await apiClient.get<ApiResponse<WhiteboardVersion>>(`/whiteboards/${id}/version`);
  return data.data as WhiteboardVersion;
}

/** Fails with 409 WHITEBOARD_CONFLICT when someone else saved after `baseVersion`. */
export async function saveWhiteboardScene(id: number, baseVersion: number, elements: StoredElement[]): Promise<WhiteboardVersion> {
  const { data } = await apiClient.put<ApiResponse<WhiteboardVersion>>(`/whiteboards/${id}/scene`, { baseVersion, elements });
  return data.data as WhiteboardVersion;
}

export async function renameWhiteboard(id: number, title: string): Promise<WhiteboardSummary> {
  const { data } = await apiClient.patch<ApiResponse<WhiteboardSummary>>(`/whiteboards/${id}`, { title });
  return data.data as WhiteboardSummary;
}

export async function deleteWhiteboard(id: number): Promise<void> {
  await apiClient.delete(`/whiteboards/${id}`);
}

export async function setWhiteboardMember(id: number, userId: number, role: WhiteboardRole): Promise<WhiteboardMember[]> {
  const { data } = await apiClient.put<ApiResponse<WhiteboardMember[]>>(`/whiteboards/${id}/members/${userId}`, { role });
  return data.data as WhiteboardMember[];
}

export async function removeWhiteboardMember(id: number, userId: number): Promise<void> {
  await apiClient.delete(`/whiteboards/${id}/members/${userId}`);
}
