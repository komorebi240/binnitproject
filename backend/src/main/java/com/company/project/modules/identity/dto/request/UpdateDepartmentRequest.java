package com.company.project.modules.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Full replacement of the editable fields; color/icon null means "default look". */
public record UpdateDepartmentRequest(
        @NotBlank(message = "name is required")
        @Size(max = 200, message = "name must be at most 200 characters")
        String name,

        @Size(max = 500, message = "description must be at most 500 characters")
        String description,

        @Size(max = 20, message = "color must be at most 20 characters")
        String color,

        @Size(max = 30, message = "icon must be at most 30 characters")
        String icon
) {
}
