package com.company.project.modules.notifications.service.impl;

import com.company.project.common.NotificationType;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.notifications.domain.NotificationEntity;
import com.company.project.modules.notifications.dto.response.NotificationResponse;
import com.company.project.modules.notifications.repository.NotificationRepository;
import com.company.project.modules.notifications.service.NotificationService;
import com.company.project.security.UserPrincipal;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Every read/write here is implicitly scoped to {@code caller.getUserId()} - there is no
 * endpoint and no method that can read or change someone else's notifications (CLAUDE.md
 * section 9/10). {@link #notify} is the one exception: an internal hook other services call to
 * create a notification FOR a user, never exposed through NotificationController.
 */
@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);
    private static final int RECENT_LIMIT = 50;
    /** Matches the column; a longer value would be rejected by the database. */
    private static final int MAX_PARAMS_LENGTH = 2000;
    private static final TypeReference<Map<String, String>> PARAMS_TYPE = new TypeReference<>() { };

    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    public NotificationServiceImpl(NotificationRepository notificationRepository, ObjectMapper objectMapper) {
        this.notificationRepository = notificationRepository;
        this.objectMapper = objectMapper;
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
            Long userId, NotificationType type, String title, String body, Map<String, String> params,
            String relatedEntityType, Long relatedEntityId) {
        notificationRepository.save(new NotificationEntity(
                userId, type, title, body, writeParams(params), relatedEntityType, relatedEntityId));
    }

    private NotificationResponse toResponse(NotificationEntity n) {
        return new NotificationResponse(
                n.getId(), n.getType(), n.getTitle(), n.getBody(), readParams(n),
                n.getRelatedEntityType(), n.getRelatedEntityId(), n.isRead(), n.getCreatedAt());
    }

    /** A notification whose params cannot be stored is still sent: it just shows its Vietnamese text in every language. */
    private String writeParams(Map<String, String> params) {
        if (params == null || params.isEmpty()) {
            return null;
        }
        try {
            String json = objectMapper.writeValueAsString(params);
            if (json.length() > MAX_PARAMS_LENGTH) {
                log.warn("Notification params are too long to store ({} characters); keeping the text only", json.length());
                return null;
            }
            return json;
        } catch (JsonProcessingException ex) {
            log.warn("Could not serialize notification params; keeping the text only", ex);
            return null;
        }
    }

    private Map<String, String> readParams(NotificationEntity n) {
        if (n.getParams() == null) {
            return null;
        }
        try {
            return objectMapper.readValue(n.getParams(), PARAMS_TYPE);
        } catch (JsonProcessingException ex) {
            log.warn("Notification {} has unreadable params; returning the text only", n.getId(), ex);
            return null;
        }
    }
}
