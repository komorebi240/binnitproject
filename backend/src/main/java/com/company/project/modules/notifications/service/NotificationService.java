package com.company.project.modules.notifications.service;

import com.company.project.common.NotificationType;
import com.company.project.modules.notifications.dto.response.NotificationResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

public interface NotificationService {

    List<NotificationResponse> listMine(UserPrincipal caller);

    long countUnread(UserPrincipal caller);

    void markRead(Long id, UserPrincipal caller);

    void markAllRead(UserPrincipal caller);

    /**
     * Internal - not exposed through a controller. Called by other services (e.g.
     * CalendarServiceImpl) to notify a user about something relevant to them.
     */
    void notify(Long userId, NotificationType type, String title, String body, String relatedEntityType, Long relatedEntityId);
}
