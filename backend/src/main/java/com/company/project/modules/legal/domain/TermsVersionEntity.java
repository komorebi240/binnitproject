package com.company.project.modules.legal.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** One published version of the terms of service; its texts live under {@code resources/terms/v<version>/}. */
@Entity
@Table(name = "terms_versions")
public class TermsVersionEntity {

    @Id
    private Integer version;

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt;

    protected TermsVersionEntity() {
        // JPA
    }

    public Integer getVersion() {
        return version;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }
}
