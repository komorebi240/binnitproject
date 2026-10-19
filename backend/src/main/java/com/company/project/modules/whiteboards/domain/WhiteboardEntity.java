package com.company.project.modules.whiteboards.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * One whiteboard. {@code scene} is the Excalidraw element list (canonical JSON written by WhiteboardScenes);
 * {@code version} is JPA's optimistic lock, bumped on every save, which is also what a save must name as its starting
 * point (see V35).
 */
@Entity
@Table(name = "whiteboards")
@EntityListeners(AuditingEntityListener.class)
public class WhiteboardEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false, updatable = false)
    private Long companyId;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private Long ownerId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String scene;

    @Column(name = "scene_bytes", nullable = false)
    private int sceneBytes;

    @Version
    @Column(nullable = false)
    private Integer version;

    @Column(name = "updated_by_user_id")
    private Long updatedByUserId;

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

    protected WhiteboardEntity() {
        // JPA
    }

    public WhiteboardEntity(Long companyId, Long ownerId, String title, String scene, int sceneBytes) {
        this.companyId = companyId;
        this.ownerId = ownerId;
        this.title = title;
        this.scene = scene;
        this.sceneBytes = sceneBytes;
        this.updatedByUserId = ownerId;
    }

    public void rename(String title) {
        this.title = title;
    }

    public void replaceScene(String scene, int sceneBytes, Long byUserId) {
        this.scene = scene;
        this.sceneBytes = sceneBytes;
        this.updatedByUserId = byUserId;
    }

    public void markDeleted() {
        this.deleted = true;
    }

    public Long getId() {
        return id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public String getTitle() {
        return title;
    }

    public String getScene() {
        return scene;
    }

    public Integer getVersion() {
        return version;
    }

    public Long getUpdatedByUserId() {
        return updatedByUserId;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public boolean isDeleted() {
        return deleted;
    }
}
