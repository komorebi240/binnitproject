package com.company.project.modules.crm.domain;

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

/** A table of customer records a company keeps for one source; see V31 for how its rows are stored. */
@Entity
@Table(name = "crm_datasets")
@EntityListeners(AuditingEntityListener.class)
public class CrmDatasetEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false, updatable = false)
    private Long companyId;

    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 30)
    private CrmSourceType sourceType;

    @Column(length = 500)
    private String description;

    /** Null: only executives use this dataset. */
    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "created_by_user_id", nullable = false, updatable = false)
    private Long createdByUserId;

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

    protected CrmDatasetEntity() {
        // JPA
    }

    public CrmDatasetEntity(
            Long companyId, String name, CrmSourceType sourceType, String description, Long departmentId, Long createdByUserId) {
        this.companyId = companyId;
        this.name = name;
        this.sourceType = sourceType;
        this.description = description;
        this.departmentId = departmentId;
        this.createdByUserId = createdByUserId;
    }

    public Long getId() {
        return id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getName() {
        return name;
    }

    public CrmSourceType getSourceType() {
        return sourceType;
    }

    public String getDescription() {
        return description;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void update(String name, CrmSourceType sourceType, String description, Long departmentId) {
        this.name = name;
        this.sourceType = sourceType;
        this.description = description;
        this.departmentId = departmentId;
    }

    public void markDeleted() {
        this.deleted = true;
    }
}
