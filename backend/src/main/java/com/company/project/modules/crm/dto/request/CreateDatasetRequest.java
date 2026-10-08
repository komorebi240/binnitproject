package com.company.project.modules.crm.dto.request;

import com.company.project.modules.crm.domain.CrmSourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** The company comes from the caller; {@code departmentId} null means "executives only". */
public record CreateDatasetRequest(
        @NotBlank(message = "name is required")
        @Size(max = 200, message = "name must be at most 200 characters")
        String name,

        @NotNull(message = "sourceType is required")
        CrmSourceType sourceType,

        @Size(max = 500, message = "description must be at most 500 characters")
        String description,

        Long departmentId
) {
}
