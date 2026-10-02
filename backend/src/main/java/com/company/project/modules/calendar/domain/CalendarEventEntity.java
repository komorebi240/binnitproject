package com.company.project.modules.calendar.domain;

import com.company.project.common.CalendarEventStatus;
import com.company.project.common.CalendarEventType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * One person's calendar entry (Phase 6 plan). {@code userId} is the owner - the only person who
 * can ever list or read this row (CLAUDE.md section 9/10, "lịch hoàn toàn riêng tư"); a manager
 * who creates it via {@code createdByUserId} does not gain read access by doing so.
 */
@Entity
@Table(name = "calendar_events")
@EntityListeners(AuditingEntityListener.class)
public class CalendarEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 20)
    private CalendarEventType eventType;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at")
    private Instant endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CalendarEventStatus status;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @LastModifiedBy
    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted = false;

    protected CalendarEventEntity() {
        // JPA
    }

    public CalendarEventEntity(
            Long userId, Long createdByUserId, String title, String description,
            CalendarEventType eventType, Instant startAt, Instant endAt, CalendarEventStatus status) {
        this.userId = userId;
        this.createdByUserId = createdByUserId;
        this.title = title;
        this.description = description;
        this.eventType = eventType;
        this.startAt = startAt;
        this.endAt = endAt;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public CalendarEventType getEventType() {
        return eventType;
    }

    public Instant getStartAt() {
        return startAt;
    }

    public Instant getEndAt() {
        return endAt;
    }

    public CalendarEventStatus getStatus() {
        return status;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void accept() {
        requireStatus(CalendarEventStatus.PENDING, "accept");
        this.status = CalendarEventStatus.CONFIRMED;
    }

    public void decline() {
        requireStatus(CalendarEventStatus.PENDING, "decline");
        this.status = CalendarEventStatus.DECLINED;
    }

    public void markDeleted() {
        this.deleted = true;
    }

    private void requireStatus(CalendarEventStatus required, String action) {
        if (status != required) {
            throw new IllegalArgumentException(
                    "Cannot " + action + " an event in status " + status + " (expected " + required + ")");
        }
    }
}
