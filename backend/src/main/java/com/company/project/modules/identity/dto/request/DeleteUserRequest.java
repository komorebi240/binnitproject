package com.company.project.modules.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The caller's own password: deleting an account is destructive, so the session alone is not enough. */
public record DeleteUserRequest(
        @NotBlank(message = "password is required")
        @Size(max = 128, message = "password is too long")
        String password
) {
}
