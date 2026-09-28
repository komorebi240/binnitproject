package com.company.project.modules.drive.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
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
 * A Drive folder a department has chosen to expose in the company-wide catalog for
 * cross-department access requests. {@code connectionUserId} is whose Google Drive connection
 * is used to actually grant access later (see FolderAccessRequestEntity/Phase 3 plan).
 */
@Entity
@Table(name = "department_drive_folders")
@EntityListeners(AuditingEntityListener.class)
public class DepartmentDriveFolderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(name = "department_id", nullable = false)
    private Long departmentId;

    @Column(name = "connection_user_id", nullable = false)
    private Long connectionUserId;

    @Column(name = "google_folder_id", nullable = false, length = 200)
    private String googleFolderId;

    @Column(name = "google_folder_name", nullable = false, length = 300)
    private String googleFolderName;

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

    protected DepartmentDriveFolderEntity() {
        // JPA
    }

    public DepartmentDriveFolderEntity(
            Long companyId, Long departmentId, Long connectionUserId, String googleFolderId, String googleFolderName) {
        this.companyId = companyId;
        this.departmentId = departmentId;
        this.connectionUserId = connectionUserId;
        this.googleFolderId = googleFolderId;
        this.googleFolderName = googleFolderName;
    }

    public Long getId() {
        return id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public Long getConnectionUserId() {
        return connectionUserId;
    }

    public String getGoogleFolderId() {
        return googleFolderId;
    }

    public String getGoogleFolderName() {
        return googleFolderName;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void markDeleted() {
        this.deleted = true;
    }
}
