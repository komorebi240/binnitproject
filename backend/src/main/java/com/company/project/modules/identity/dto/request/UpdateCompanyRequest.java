package com.company.project.modules.identity.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCompanyRequest(
        @NotBlank(message = "name is required")
        @Size(max = 200, message = "name must be at most 200 characters")
        String name,

        @Email(message = "contactEmail must be a valid address")
        @Size(max = 200, message = "contactEmail must be at most 200 characters")
        String contactEmail
) {
}
