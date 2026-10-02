package com.company.project.modules.kpi.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A descriptive incentive tier - deliberately a label only, never a monetary amount (Phase 5
 * plan: no real compensation data in this system yet, CLAUDE.md section 7). Matched against a
 * KPI score by taking the highest {@code minScore} that is still &lt;= the score.
 */
@Entity
@Table(name = "kpi_incentive_tiers")
public class KpiIncentiveTierEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(name = "min_score", nullable = false)
    private int minScore;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected KpiIncentiveTierEntity() {
        // JPA
    }

    public KpiIncentiveTierEntity(Long companyId, int minScore, String label, int sortOrder) {
        this.companyId = companyId;
        this.minScore = minScore;
        this.label = label;
        this.sortOrder = sortOrder;
    }

    public Long getId() {
        return id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public int getMinScore() {
        return minScore;
    }

    public String getLabel() {
        return label;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
