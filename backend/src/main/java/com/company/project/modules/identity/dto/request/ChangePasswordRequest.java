package com.company.project.modules.identity.dto.request;

import com.company.project.common.validation.MaxUtf8Bytes;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "currentPassword is required")
        String currentPassword,

        @NotBlank(message = "newPassword is required")
        @Size(min = 8, message = "newPassword must be at least 8 characters")
        @MaxUtf8Bytes(value = 72, message = "newPassword must be at most 72 bytes (BCrypt's limit; accented letters take 2-3 bytes)")
        String newPassword
) {
}
