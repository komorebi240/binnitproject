package com.company.project.modules.drive.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * User pastes a Google Drive folder link or bare ID. {@code departmentId} is only read for an
 * EXECUTIVE caller (who has no "home" department of their own and must say which one they mean);
 * every other role always registers into their own department and this field is ignored for
 * them — never trusted as a way to claim a different department (CLAUDE.md section 9/10).
 */
public record RegisterFolderRequest(
        @NotBlank(message = "folderLinkOrId is required") String folderLinkOrId,
        Long departmentId
) {
}
