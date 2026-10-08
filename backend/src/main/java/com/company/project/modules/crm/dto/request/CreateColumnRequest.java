package com.company.project.modules.crm.dto.request;

import com.company.project.modules.crm.domain.CrmColumnType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateColumnRequest(
        @NotBlank(message = "name is required")
        @Size(max = 100, message = "name must be at most 100 characters")
        String name,

        @NotNull(message = "dataType is required")
        CrmColumnType dataType
) {
}
