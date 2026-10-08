package com.company.project.modules.crm.dto.request;

import com.company.project.modules.crm.domain.CrmSourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Replaces the dataset's details; a blank description clears it. */
public record UpdateDatasetRequest(
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
