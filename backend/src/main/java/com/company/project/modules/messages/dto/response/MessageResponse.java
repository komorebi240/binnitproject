package com.company.project.modules.messages.dto.response;

import java.time.Instant;

/** {@code body} is empty for a recalled message (and for an attachment-only one); {@code attachment} is null once recalled. */
public record MessageResponse(
        Long id,
        Long senderId,
        Long recipientId,
        String body,
        boolean read,
        Instant createdAt,
        boolean recalled,
        AttachmentResponse attachment
) {
}
