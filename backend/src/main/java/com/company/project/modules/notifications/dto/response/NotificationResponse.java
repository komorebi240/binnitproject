package com.company.project.modules.notifications.dto.response;

import com.company.project.common.NotificationType;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        NotificationType type,
        String title,
        String body,
        String relatedEntityType,
        Long relatedEntityId,
        boolean read,
        Instant createdAt
) {
}
