package com.company.project.modules.tasks.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddChecklistItemRequest(
        @NotBlank(message = "text is required")
        @Size(max = 200, message = "text must be at most 200 characters")
        String text
) {
}
