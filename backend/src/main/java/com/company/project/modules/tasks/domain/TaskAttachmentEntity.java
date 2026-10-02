package com.company.project.modules.tasks.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** File attached to a task; the bytes live on disk under {@code storedName} (see AttachmentStorage). */
@Entity
@Table(name = "task_attachments")
public class TaskAttachmentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_id", nullable = false)
    private Long taskId;

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

    @Column(name = "uploaded_by_user_id", nullable = false)
    private Long uploadedByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected TaskAttachmentEntity() {
        // JPA
    }

    public TaskAttachmentEntity(
            Long taskId, String storedName, String originalName, String contentType, long sizeBytes,
            boolean image, Long uploadedByUserId) {
        this.taskId = taskId;
        this.storedName = storedName;
        this.originalName = originalName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.image = image;
        this.uploadedByUserId = uploadedByUserId;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getTaskId() {
        return taskId;
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

    public Long getUploadedByUserId() {
        return uploadedByUserId;
    }
}
