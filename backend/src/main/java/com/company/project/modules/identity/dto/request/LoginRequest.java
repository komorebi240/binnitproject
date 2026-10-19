package com.company.project.modules.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Lengths are capped because a stranger chooses these values and the username becomes a rate-limit key (RateLimiter):
 * an unbounded one let a single address fill the server's memory. 100 is the length of users.username.
 */
public record LoginRequest(
        @NotBlank(message = "username is required")
        @Size(max = 100, message = "username must be at most 100 characters")
        String username,

        @NotBlank(message = "password is required")
        @Size(max = 128, message = "password must be at most 128 characters")
        String password
) {
}
