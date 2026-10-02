package com.company.project.modules.messages.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SendMessageRequest(
        @NotNull(message = "recipientUserId is required")
        Long recipientUserId,

        @NotBlank(message = "body is required")
        @Size(max = 2000, message = "body must be at most 2000 characters")
        String body
) {
}
