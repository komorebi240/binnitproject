package com.company.project.modules.kpi.dto.response;

public record KpiSummaryResponse(
        Long userId,
        String fullName,
        int periodYear,
        int periodMonth,
        int totalAssigned,
        int completed,
        double completionRatePercent,
        double onTimeRatePercent,
        int kpiScore,
        String incentiveLabel
) {
}
