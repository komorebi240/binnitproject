import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/kpiApi";
import type { IncentiveTierInput } from "../types";

const CONFIG_KEY = ["kpi", "config"] as const;
const MY_SUMMARY_KEY = ["kpi", "me", "summary"] as const;
const userSummaryKey = (userId: number) => ["kpi", "users", userId, "summary"] as const;

export function useKpiConfig() {
  return useQuery({ queryKey: CONFIG_KEY, queryFn: api.getConfig });
}

export function useUpdateKpiConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (completionWeight: number) => api.updateConfig(completionWeight),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONFIG_KEY }),
  });
}

export function useReplaceIncentiveTiers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tiers: IncentiveTierInput[]) => api.replaceIncentiveTiers(tiers),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONFIG_KEY }),
  });
}

export function useMyKpiSummary() {
  return useQuery({ queryKey: MY_SUMMARY_KEY, queryFn: api.getMySummary });
}

export function useUserKpiSummary(userId: number, enabled: boolean) {
  return useQuery({
    queryKey: userSummaryKey(userId),
    queryFn: () => api.getUserSummary(userId),
    enabled,
  });
}
