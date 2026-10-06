package com.company.project.modules.projects.dto.request;

import jakarta.validation.constraints.NotNull;

public record LinkProjectFolderRequest(
        @NotNull(message = "catalogFolderId is required")
        Long catalogFolderId
) {
}
