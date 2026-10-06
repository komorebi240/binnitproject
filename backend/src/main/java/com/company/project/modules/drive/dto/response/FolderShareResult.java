package com.company.project.modules.drive.dto.response;

/** How many people a folder was shared with, and why the others were not (they have not connected Google Drive, or Google refused). */
public record FolderShareResult(int granted, int notConnected, int failed) {
}
