package com.company.project.modules.drive.dto.response;

public record CatalogFolderResponse(
        Long id,
        Long departmentId,
        String departmentName,
        String googleFolderId,
        String googleFolderName
) {
}
