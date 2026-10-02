package com.company.project.modules.messages.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * One direct message (Phase 7 plan) - no conversation/thread entity; a thread between two users
 * is derived at query time as every row where (sender, recipient) matches either direction. 1-1
 * only, no groups.
 */
@Entity
@Table(name = "messages")
public class MessageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "recipient_id", nullable = false)
    private Long recipientId;

    @Column(nullable = false, length = 2000)
    private String body;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "recalled_at")
    private Instant recalledAt;

    protected MessageEntity() {
        // JPA
    }

    public MessageEntity(Long senderId, Long recipientId, String body) {
        this.senderId = senderId;
        this.recipientId = recipientId;
        this.body = body;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getSenderId() {
        return senderId;
    }

    public Long getRecipientId() {
        return recipientId;
    }

    public String getBody() {
        return body;
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

    public boolean isRecalled() {
        return recalledAt != null;
    }

    /** Blanks the content but keeps the row, so the thread still shows a "recalled" placeholder in order. */
    public void recall() {
        this.body = "";
        this.recalledAt = Instant.now();
    }
}
