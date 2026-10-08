package com.company.project.modules.notifications.dto.response;

import com.company.project.common.NotificationType;

import java.time.Instant;
import java.util.Map;

/**
 * {@code title}/{@code body} are the Vietnamese text stored with the notification. {@code params} holds the values
 * that text was built from (null for older rows), so a client can word the notification in its user's language
 * from {@code type} + {@code params} and fall back to {@code title}/{@code body} when it cannot.
 */
public record NotificationResponse(
        Long id,
        NotificationType type,
        String title,
        String body,
        Map<String, String> params,
        String relatedEntityType,
        Long relatedEntityId,
        boolean read,
        Instant createdAt
) {
}
