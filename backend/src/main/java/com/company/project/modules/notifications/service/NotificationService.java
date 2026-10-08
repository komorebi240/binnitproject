package com.company.project.modules.notifications.service;

import com.company.project.common.NotificationType;
import com.company.project.modules.notifications.dto.response.NotificationResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;
import java.util.Map;

public interface NotificationService {

    List<NotificationResponse> listMine(UserPrincipal caller);

    long countUnread(UserPrincipal caller);

    void markRead(Long id, UserPrincipal caller);

    void markAllRead(UserPrincipal caller);

    /**
     * Internal - not exposed through a controller. Called by other services (e.g.
     * CalendarServiceImpl) to notify a user about something relevant to them.
     * {@code title}/{@code body} are the Vietnamese text; {@code params} are the values it was built from (who did it,
     * which task...), kept so the client can word the notification in the reader's language. Never put anything in
     * {@code params} the reader is not allowed to see.
     */
    void notify(
            Long userId, NotificationType type, String title, String body, Map<String, String> params,
            String relatedEntityType, Long relatedEntityId);
}
