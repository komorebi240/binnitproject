package com.company.project.modules.tasks.dto.request;

import jakarta.validation.constraints.NotNull;

public record SetChecklistItemDoneRequest(
        @NotNull(message = "done is required")
        Boolean done
) {
}
