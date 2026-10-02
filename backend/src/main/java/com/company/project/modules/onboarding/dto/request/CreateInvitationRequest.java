package com.company.project.modules.onboarding.dto.request;

import com.company.project.common.AuthorityLevel;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Whether the caller may grant this level at this department/team is a service-layer rule (same as creating a user). */
public record CreateInvitationRequest(
        @NotBlank(message = "email is required")
        @Email(message = "email must be a valid address")
        @Size(max = 200, message = "email must be at most 200 characters")
        String email,

        @NotNull(message = "authorityLevel is required")
        AuthorityLevel authorityLevel,

        Long departmentId,

        Long teamId,

        @Size(max = 100, message = "title must be at most 100 characters")
        String title
) {
}
