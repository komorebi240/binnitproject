package com.company.project.modules.identity.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Self-service only - a caller always updates their OWN row (see AuthController), so there is
 * no userId field to guard against (CLAUDE.md section 9/10 - no scope check is even needed here
 * because there is no target to spoof).
 */
public record UpdateProfileRequest(
        @NotBlank(message = "email is required")
        @Email(message = "email must be a valid address")
        String email,

        @Size(max = 30, message = "phone must be at most 30 characters")
        String phone
) {
}
