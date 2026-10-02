export interface IncentiveTier {
  id: number;
  minScore: number;
  label: string;
}

export interface KpiConfig {
  completionWeight: number;
  onTimeWeight: number;
  tiers: IncentiveTier[];
}

export interface KpiSummary {
  userId: number;
  fullName: string;
  periodYear: number;
  periodMonth: number;
  totalAssigned: number;
  completed: number;
  completionRatePercent: number;
  onTimeRatePercent: number;
  kpiScore: number;
  incentiveLabel: string | null;
}

export interface IncentiveTierInput {
  minScore: number;
  label: string;
}
