package com.company.project.modules.messages.dto.response;

public record AttachmentResponse(Long id, String fileName, String contentType, long sizeBytes, boolean image) {
}
