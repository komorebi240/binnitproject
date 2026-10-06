package com.company.project.modules.projects.dto.response;

public record ProjectFolderResponse(
        Long id,
        Long catalogFolderId,
        String folderName,
        Long departmentId,
        String departmentName,
        String googleFolderId
) {
}
