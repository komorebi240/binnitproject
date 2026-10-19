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

    @Column(name = "is_forwarded", nullable = false)
    private boolean forwarded = false;

    @Column(name = "hidden_for_sender", nullable = false)
    private boolean hiddenForSender = false;

    @Column(name = "hidden_for_recipient", nullable = false)
    private boolean hiddenForRecipient = false;

    protected MessageEntity() {
        // JPA
    }

    public MessageEntity(Long senderId, Long recipientId, String body) {
        this.senderId = senderId;
        this.recipientId = recipientId;
        this.body = body;
        this.createdAt = Instant.now();
    }

    /** A copy of someone's message sent on by {@code senderId}; shown as "Forwarded". */
    public static MessageEntity forwardedCopy(Long senderId, Long recipientId, String body) {
        MessageEntity copy = new MessageEntity(senderId, recipientId, body);
        copy.forwarded = true;
        return copy;
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

    public boolean isForwarded() {
        return forwarded;
    }

    public boolean isParticipant(Long userId) {
        return senderId.equals(userId) || recipientId.equals(userId);
    }

    /** "Delete for me": only {@code userId}'s side stops seeing the message. */
    public boolean isHiddenFor(Long userId) {
        return senderId.equals(userId) ? hiddenForSender : recipientId.equals(userId) && hiddenForRecipient;
    }

    /** Hides the message for one participant; a recipient who hides an unread message has dealt with it, so it is read. */
    public void hideFor(Long userId) {
        if (senderId.equals(userId)) {
            hiddenForSender = true;
        }
        if (recipientId.equals(userId)) {
            hiddenForRecipient = true;
            read = true;
        }
    }

    /** Blanks the content but keeps the row, so the thread still shows a "recalled" placeholder in order. */
    public void recall() {
        this.body = "";
        this.recalledAt = Instant.now();
    }
}
