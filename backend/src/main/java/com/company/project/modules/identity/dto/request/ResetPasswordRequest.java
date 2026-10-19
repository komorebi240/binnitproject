package com.company.project.modules.identity.dto.request;

import com.company.project.common.validation.MaxUtf8Bytes;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Username (or email) and code are capped because the username becomes a rate-limit key (RateLimiter). */
public record ResetPasswordRequest(
        @NotBlank(message = "username is required")
        @Size(max = 200, message = "username must be at most 200 characters")
        String username,

        @NotBlank(message = "otp is required")
        @Size(max = 12, message = "otp must be at most 12 characters")
        String otp,

        @NotBlank(message = "newPassword is required")
        @Size(min = 8, message = "newPassword must be at least 8 characters")
        @MaxUtf8Bytes(value = 72, message = "newPassword must be at most 72 bytes (BCrypt's limit; accented letters take 2-3 bytes)")
        String newPassword
) {
}
