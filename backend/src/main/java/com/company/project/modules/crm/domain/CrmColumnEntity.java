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

/** One column of a dataset. Its type is fixed when it is created (add a new column instead of changing one). */
@Entity
@Table(name = "crm_columns")
@EntityListeners(AuditingEntityListener.class)
public class CrmColumnEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dataset_id", nullable = false, updatable = false)
    private Long datasetId;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, updatable = false, length = 20)
    private CrmColumnType dataType;

    @Column(nullable = false)
    private int position;

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

    protected CrmColumnEntity() {
        // JPA
    }

    public CrmColumnEntity(Long datasetId, String name, CrmColumnType dataType, int position) {
        this.datasetId = datasetId;
        this.name = name;
        this.dataType = dataType;
        this.position = position;
    }

    public Long getId() {
        return id;
    }

    public Long getDatasetId() {
        return datasetId;
    }

    public String getName() {
        return name;
    }

    public CrmColumnType getDataType() {
        return dataType;
    }

    public int getPosition() {
        return position;
    }

    public void rename(String name) {
        this.name = name;
    }

    public void markDeleted() {
        this.deleted = true;
    }
}
