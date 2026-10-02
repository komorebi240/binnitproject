package com.company.project.modules.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "username is required")
        String username,

        @NotBlank(message = "otp is required")
        String otp,

        @NotBlank(message = "newPassword is required")
        @Size(min = 8, message = "newPassword must be at least 8 characters")
        String newPassword
) {
}
