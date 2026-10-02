package com.company.project.modules.identity.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank(message = "username is required")
        String username
) {
}
