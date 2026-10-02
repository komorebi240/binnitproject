package com.company.project.modules.kpi.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record UpdateKpiConfigRequest(
        @NotNull(message = "completionWeight is required")
        @DecimalMin(value = "0.0", message = "completionWeight must be between 0 and 1")
        @DecimalMax(value = "1.0", message = "completionWeight must be between 0 and 1")
        Double completionWeight
) {
}
