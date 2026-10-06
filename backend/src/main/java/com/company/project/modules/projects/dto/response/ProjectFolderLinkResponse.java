package com.company.project.modules.projects.dto.response;

import com.company.project.modules.drive.dto.response.FolderShareResult;

public record ProjectFolderLinkResponse(ProjectFolderResponse folder, FolderShareResult share) {
}
