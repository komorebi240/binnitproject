package com.company.project.modules.messages.dto.response;

/** {@code image} and {@code video} are shown in the conversation; anything else is offered as a download. */
public record AttachmentResponse(Long id, String fileName, String contentType, long sizeBytes, boolean image, boolean video) {
}
