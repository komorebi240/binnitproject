package com.company.project.modules.kpi.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/** Sort order is implied by list order - the caller sends the tiers in the order they should be evaluated/displayed. */
public record ReplaceIncentiveTiersRequest(
        @NotNull(message = "tiers is required")
        @Valid
        List<IncentiveTierInput> tiers
) {
}
