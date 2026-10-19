package com.company.project.modules.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code username} is a username or an email (users.email is 200 long); capped because it becomes a rate-limit key. */
public record ForgotPasswordRequest(
        @NotBlank(message = "username is required")
        @Size(max = 200, message = "username must be at most 200 characters")
        String username
) {
}
