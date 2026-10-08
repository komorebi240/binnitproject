package com.company.project.modules.crm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** One line of the CRM audit log. Written once and never changed; {@code detail} holds counts, never customer details. */
@Entity
@Table(name = "crm_audit_log")
public class CrmAuditLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false, updatable = false)
    private Long companyId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 30)
    private CrmAuditAction action;

    @Column(name = "dataset_id", updatable = false)
    private Long datasetId;

    @Column(length = 500, updatable = false)
    private String detail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected CrmAuditLogEntity() {
        // JPA
    }

    public CrmAuditLogEntity(Long companyId, Long userId, CrmAuditAction action, Long datasetId, String detail) {
        this.companyId = companyId;
        this.userId = userId;
        this.action = action;
        this.datasetId = datasetId;
        this.detail = detail;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public CrmAuditAction getAction() {
        return action;
    }

    public Long getDatasetId() {
        return datasetId;
    }

    public String getDetail() {
        return detail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
