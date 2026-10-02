package com.company.project.modules.kpi.domain;

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
 * One row per company (Phase 5 plan). {@code completionWeight} is the only tunable knob -
 * the on-time weight is always {@code 1 - completionWeight}, so the two can never drift out of
 * sync by storing them as two independent columns. EXECUTIVE-only to write; anyone in the
 * company can read it (transparency of how their KPI is computed).
 */
@Entity
@Table(name = "kpi_configs")
@EntityListeners(AuditingEntityListener.class)
public class KpiConfigEntity {

    public static final double DEFAULT_COMPLETION_WEIGHT = 0.7;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false, unique = true)
    private Long companyId;

    @Column(name = "completion_weight", nullable = false)
    private double completionWeight = DEFAULT_COMPLETION_WEIGHT;

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

    protected KpiConfigEntity() {
        // JPA
    }

    public KpiConfigEntity(Long companyId, double completionWeight) {
        this.companyId = companyId;
        this.completionWeight = completionWeight;
    }

    public Long getId() {
        return id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public double getCompletionWeight() {
        return completionWeight;
    }

    public void setCompletionWeight(double completionWeight) {
        this.completionWeight = completionWeight;
    }
}
