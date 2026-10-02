package com.company.project.modules.messages.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** "{@code userId} has archived their conversation with {@code otherUserId}" - one-sided, never visible to the other party. */
@Entity
@Table(name = "message_archives")
public class MessageArchiveEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "other_user_id", nullable = false)
    private Long otherUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected MessageArchiveEntity() {
        // JPA
    }

    public MessageArchiveEntity(Long userId, Long otherUserId) {
        this.userId = userId;
        this.otherUserId = otherUserId;
        this.createdAt = Instant.now();
    }

    public Long getOtherUserId() {
        return otherUserId;
    }
}
