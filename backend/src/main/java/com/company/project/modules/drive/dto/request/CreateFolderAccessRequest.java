package com.company.project.modules.drive.dto.request;

import jakarta.validation.constraints.NotNull;

public record CreateFolderAccessRequest(
        @NotNull(message = "catalogFolderId is required") Long catalogFolderId,
        String note
) {
}
