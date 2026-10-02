package com.company.project.modules.onboarding.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** The admin's email is not a field: it is whatever address the verification token was issued for. */
public record RegisterCompanyRequest(
        @NotBlank(message = "verificationToken is required")
        @Size(max = 100, message = "verificationToken is too long")
        String verificationToken,

        @NotBlank(message = "companyName is required")
        @Size(max = 200, message = "companyName must be at most 200 characters")
        String companyName,

        @Email(message = "contactEmail must be a valid address")
        @Size(max = 200, message = "contactEmail must be at most 200 characters")
        String contactEmail,

        @NotBlank(message = "username is required")
        @Pattern(regexp = "[A-Za-z0-9._-]{3,100}", message = "username must be 3-100 characters: letters, digits, dot, underscore or dash")
        String username,

        @NotBlank(message = "fullName is required")
        @Size(max = 200, message = "fullName must be at most 200 characters")
        String fullName,

        @NotBlank(message = "password is required")
        @Size(min = 8, max = 72, message = "password must be 8-72 characters")
        String password
) {
}
