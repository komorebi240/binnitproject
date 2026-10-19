package com.company.project.modules.onboarding.dto.request;

import com.company.project.common.validation.MaxUtf8Bytes;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Company, level, department and email all come from the invitation - the invitee only chooses who they are. */
public record AcceptInvitationRequest(
        @NotBlank(message = "username is required")
        @Pattern(regexp = "[A-Za-z0-9._-]{3,100}", message = "username must be 3-100 characters: letters, digits, dot, underscore or dash")
        String username,

        @NotBlank(message = "fullName is required")
        @Size(max = 200, message = "fullName must be at most 200 characters")
        String fullName,

        @NotBlank(message = "password is required")
        @Size(min = 8, max = 72, message = "password must be 8-72 characters")
        @MaxUtf8Bytes(value = 72, message = "password must be at most 72 bytes (BCrypt's limit; accented letters take 2-3 bytes)")
        String password,

        @NotNull(message = "acceptedTermsVersion is required")
        Integer acceptedTermsVersion
) {
}
