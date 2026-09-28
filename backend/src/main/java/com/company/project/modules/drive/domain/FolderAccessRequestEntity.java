package com.company.project.modules.drive.domain;

import com.company.project.common.FolderRequestStatus;
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
 * A cross-department request for access to a catalog folder. Status transitions are guarded
 * here as a last-resort check (IllegalStateException); the service layer is expected to
 * pre-validate and raise a proper 422 BusinessException first — same pattern as TaskEntity.
 */
@Entity
@Table(name = "folder_access_requests")
@EntityListeners(AuditingEntityListener.class)
public class FolderAccessRequestEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(name = "catalog_folder_id", nullable = false)
    private Long catalogFolderId;

    @Column(name = "requester_user_id", nullable = false)
    private Long requesterUserId;

    @Column(name = "requester_department_id", nullable = false)
    private Long requesterDepartmentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FolderRequestStatus status = FolderRequestStatus.PENDING;

    @Column(name = "decided_by_user_id")
    private Long decidedByUserId;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(length = 1000)
    private String note;

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

    protected FolderAccessRequestEntity() {
        // JPA
    }

    public FolderAccessRequestEntity(
            Long companyId, Long catalogFolderId, Long requesterUserId, Long requesterDepartmentId, String note) {
        this.companyId = companyId;
        this.catalogFolderId = catalogFolderId;
        this.requesterUserId = requesterUserId;
        this.requesterDepartmentId = requesterDepartmentId;
        this.note = note;
    }

    public void approve(Long approverUserId) {
        requirePending("approve");
        this.status = FolderRequestStatus.APPROVED;
        this.decidedByUserId = approverUserId;
        this.decidedAt = Instant.now();
    }

    public void reject(Long approverUserId) {
        requirePending("reject");
        this.status = FolderRequestStatus.REJECTED;
        this.decidedByUserId = approverUserId;
        this.decidedAt = Instant.now();
    }

    private void requirePending(String action) {
        if (status != FolderRequestStatus.PENDING) {
            throw new IllegalStateException("Cannot " + action + " a request in status " + status);
        }
    }

    public Long getId() {
        return id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public Long getCatalogFolderId() {
        return catalogFolderId;
    }

    public Long getRequesterUserId() {
        return requesterUserId;
    }

    public Long getRequesterDepartmentId() {
        return requesterDepartmentId;
    }

    public FolderRequestStatus getStatus() {
        return status;
    }

    public Long getDecidedByUserId() {
        return decidedByUserId;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    public String getNote() {
        return note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public boolean isDeleted() {
        return deleted;
    }
}
