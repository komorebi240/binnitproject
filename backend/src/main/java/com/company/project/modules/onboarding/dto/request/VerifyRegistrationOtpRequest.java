package com.company.project.modules.onboarding.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerifyRegistrationOtpRequest(
        @NotBlank(message = "email is required")
        @Email(message = "email must be a valid address")
        @Size(max = 200, message = "email must be at most 200 characters")
        String email,

        @NotBlank(message = "otp is required")
        @Pattern(regexp = "\\d{6}", message = "otp must be 6 digits")
        String otp
) {
}
