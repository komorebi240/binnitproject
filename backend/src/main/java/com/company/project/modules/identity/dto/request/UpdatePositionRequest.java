package com.company.project.modules.identity.dto.request;

import com.company.project.common.AuthorityLevel;
import jakarta.validation.constraints.NotNull;

/**
 * A promotion/transfer - same shape as the position half of CreateUserRequest. Whether the
 * caller may grant this level at this department/team is re-checked in the service layer with
 * the same rules used at creation time (CLAUDE.md section 9/10).
 */
public record UpdatePositionRequest(
        @NotNull(message = "authorityLevel is required")
        AuthorityLevel authorityLevel,

        String title,

        Long departmentId,

        Long teamId
) {
}
