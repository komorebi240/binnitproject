package com.company.project.modules.notifications.service.impl;

import com.company.project.common.NotificationType;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.notifications.domain.NotificationEntity;
import com.company.project.modules.notifications.dto.response.NotificationResponse;
import com.company.project.modules.notifications.repository.NotificationRepository;
import com.company.project.modules.notifications.service.NotificationService;
import com.company.project.security.UserPrincipal;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Every read/write here is implicitly scoped to {@code caller.getUserId()} - there is no
 * endpoint and no method that can read or change someone else's notifications (CLAUDE.md
 * section 9/10). {@link #notify} is the one exception: an internal hook other services call to
 * create a notification FOR a user, never exposed through NotificationController.
 */
@Service
public class NotificationServiceImpl implements NotificationService {

    private static final int RECENT_LIMIT = 50;

    private final NotificationRepository notificationRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> listMine(UserPrincipal caller) {
        return notificationRepository.findRecentByUserId(caller.getUserId(), Limit.of(RECENT_LIMIT)).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long countUnread(UserPrincipal caller) {
        return notificationRepository.countByUserIdAndReadFalse(caller.getUserId());
    }

    @Override
    @Transactional
    public void markRead(Long id, UserPrincipal caller) {
        NotificationEntity notification = notificationRepository.findByIdAndUserId(id, caller.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification", id));
        notification.markRead();
    }

    @Override
    @Transactional
    public void markAllRead(UserPrincipal caller) {
        notificationRepository.findAllByUserIdAndReadFalse(caller.getUserId())
                .forEach(NotificationEntity::markRead);
    }

    @Override
    @Transactional
    public void notify(
            Long userId, NotificationType type, String title, String body,
            String relatedEntityType, Long relatedEntityId) {
        notificationRepository.save(
                new NotificationEntity(userId, type, title, body, relatedEntityType, relatedEntityId));
    }

    private NotificationResponse toResponse(NotificationEntity n) {
        return new NotificationResponse(
                n.getId(), n.getType(), n.getTitle(), n.getBody(),
                n.getRelatedEntityType(), n.getRelatedEntityId(), n.isRead(), n.getCreatedAt());
    }
}
