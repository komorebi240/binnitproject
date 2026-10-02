package com.company.project.modules.messages.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BroadcastMessageRequest(
        @NotBlank(message = "body is required")
        @Size(max = 2000, message = "body must be at most 2000 characters")
        String body
) {
}
