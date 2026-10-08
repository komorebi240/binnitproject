import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { Terms } from "../types";

export async function getCurrentTerms(language: string): Promise<Terms> {
  const { data } = await apiClient.get<ApiResponse<Terms>>("/terms/current", { params: { lang: language } });
  return data.data as Terms;
}

export async function acceptTerms(version: number): Promise<void> {
  await apiClient.post("/terms/accept", { version });
}
