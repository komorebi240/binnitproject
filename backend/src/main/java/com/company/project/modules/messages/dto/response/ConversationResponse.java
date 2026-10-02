package com.company.project.modules.messages.dto.response;

import com.company.project.common.PresenceStatus;

import java.time.Instant;

/**
 * {@code lastMessageAttachmentName} is set when the latest message carries a file, so the list can
 * show a placeholder instead of an empty preview; {@code lastMessageRecalled} likewise.
 */
public record ConversationResponse(
        Long otherUserId,
        String otherUserName,
        String otherUserAvatarUrl,
        PresenceStatus otherUserPresenceStatus,
        String lastMessageBody,
        boolean lastMessageRecalled,
        String lastMessageAttachmentName,
        Instant lastMessageAt,
        long unreadCount
) {
}
