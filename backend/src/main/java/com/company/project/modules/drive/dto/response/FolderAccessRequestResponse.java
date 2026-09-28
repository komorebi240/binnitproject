package com.company.project.modules.drive.dto.response;

import com.company.project.common.FolderRequestStatus;

import java.time.Instant;

public record FolderAccessRequestResponse(
        Long id,
        Long catalogFolderId,
        String googleFolderName,
        Long ownerDepartmentId,
        String ownerDepartmentName,
        Long requesterUserId,
        String requesterUserName,
        Long requesterDepartmentId,
        String requesterDepartmentName,
        FolderRequestStatus status,
        Long decidedByUserId,
        String decidedByUserName,
        Instant decidedAt,
        String note,
        Instant createdAt
) {
}
