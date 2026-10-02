import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type { IncentiveTierInput, KpiConfig, KpiSummary } from "../types";

export async function getConfig(): Promise<KpiConfig> {
  const { data } = await apiClient.get<ApiResponse<KpiConfig>>("/kpi/config");
  return data.data as KpiConfig;
}

export async function updateConfig(completionWeight: number): Promise<KpiConfig> {
  const { data } = await apiClient.patch<ApiResponse<KpiConfig>>("/kpi/config", { completionWeight });
  return data.data as KpiConfig;
}

export async function replaceIncentiveTiers(tiers: IncentiveTierInput[]): Promise<KpiConfig> {
  const { data } = await apiClient.put<ApiResponse<KpiConfig>>("/kpi/config/incentive-tiers", { tiers });
  return data.data as KpiConfig;
}

export async function getMySummary(): Promise<KpiSummary> {
  const { data } = await apiClient.get<ApiResponse<KpiSummary>>("/kpi/me/summary");
  return data.data as KpiSummary;
}

export async function getUserSummary(userId: number): Promise<KpiSummary> {
  const { data } = await apiClient.get<ApiResponse<KpiSummary>>(`/kpi/users/${userId}/summary`);
  return data.data as KpiSummary;
}
