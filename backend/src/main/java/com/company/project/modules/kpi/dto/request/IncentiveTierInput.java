package com.company.project.modules.kpi.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record IncentiveTierInput(
        @NotNull(message = "minScore is required")
        @Min(value = 0, message = "minScore must be between 0 and 100")
        @Max(value = 100, message = "minScore must be between 0 and 100")
        Integer minScore,

        @NotBlank(message = "label is required")
        String label
) {
}
