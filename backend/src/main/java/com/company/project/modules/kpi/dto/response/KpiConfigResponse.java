package com.company.project.modules.kpi.dto.response;

import java.util.List;

public record KpiConfigResponse(
        double completionWeight,
        double onTimeWeight,
        List<IncentiveTierResponse> tiers
) {
}
