package com.company.project.modules.messages.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** File attached to one message; the bytes live on disk under {@code storedName} (see AttachmentStorage). */
@Entity
@Table(name = "message_attachments")
public class MessageAttachmentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", nullable = false)
    private Long messageId;

    @Column(name = "stored_name", nullable = false, length = 100)
    private String storedName;

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "is_image", nullable = false)
    private boolean image;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected MessageAttachmentEntity() {
        // JPA
    }

    public MessageAttachmentEntity(
            Long messageId, String storedName, String originalName, String contentType, long sizeBytes, boolean image) {
        this.messageId = messageId;
        this.storedName = storedName;
        this.originalName = originalName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.image = image;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getMessageId() {
        return messageId;
    }

    public String getStoredName() {
        return storedName;
    }

    public String getOriginalName() {
        return originalName;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public boolean isImage() {
        return image;
    }
}
