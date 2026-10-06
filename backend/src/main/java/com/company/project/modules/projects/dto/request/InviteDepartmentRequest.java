package com.company.project.modules.projects.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InviteDepartmentRequest(
        @NotNull(message = "departmentId is required")
        Long departmentId,

        @Size(max = 500, message = "note must be at most 500 characters")
        String note
) {
}
