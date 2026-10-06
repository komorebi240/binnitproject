package com.company.project.modules.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ConfirmEmailChangeRequest(
        @NotBlank(message = "otp is required")
        @Pattern(regexp = "\\d{6}", message = "otp must be 6 digits")
        String otp
) {
}
