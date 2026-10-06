package com.company.project.modules.projects.dto.response;

import java.time.Instant;

public record ProjectMessageResponse(
        Long id,
        Long senderId,
        String senderName,
        String senderAvatarUrl,
        String body,
        Instant createdAt
) {
}
