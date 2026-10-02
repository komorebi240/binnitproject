package com.company.project.modules.tasks.dto.response;

public record TaskAttachmentResponse(
        Long id, String fileName, String contentType, long sizeBytes, boolean image, Long uploadedByUserId) {
}
