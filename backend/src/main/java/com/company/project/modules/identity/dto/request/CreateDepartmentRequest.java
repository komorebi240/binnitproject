package com.company.project.modules.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * No companyId field on purpose - the target company is always the caller's own
 * (from their authenticated principal), never something the client supplies (CLAUDE.md
 * section 9/10: don't even accept a scoping id that would need to be double-checked).
 */
public record CreateDepartmentRequest(
        @NotBlank(message = "name is required")
        @Size(max = 200, message = "name must be at most 200 characters")
        String name,

        @Size(max = 500, message = "description must be at most 500 characters")
        String description
) {
}
