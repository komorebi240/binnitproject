package com.company.project.modules.notifications.domain;

import com.company.project.common.NotificationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A durable, per-user notification (Phase 6 plan) - a bell-icon unread badge needs a row that
 * survives logout/refresh, not a transient toast. Never exposes whose action triggered it beyond
 * {@code title}/{@code body}; {@code relatedEntityType}/{@code relatedEntityId} are an optional,
 * loosely-typed deep link (e.g. a CALENDAR_EVENT_INVITE points at a calendar_events row) kept
 * generic on purpose so a future notification source doesn't need its own table.
 */
@Entity
@Table(name = "notifications")
public class NotificationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationType type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String body;

    @Column(name = "related_entity_type", length = 50)
    private String relatedEntityType;

    @Column(name = "related_entity_id")
    private Long relatedEntityId;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected NotificationEntity() {
        // JPA
    }

    public NotificationEntity(
            Long userId, NotificationType type, String title, String body,
            String relatedEntityType, Long relatedEntityId) {
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.body = body;
        this.relatedEntityType = relatedEntityType;
        this.relatedEntityId = relatedEntityId;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public NotificationType getType() {
        return type;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public String getRelatedEntityType() {
        return relatedEntityType;
    }

    public Long getRelatedEntityId() {
        return relatedEntityId;
    }

    public boolean isRead() {
        return read;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void markRead() {
        this.read = true;
    }
}
