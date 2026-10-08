package com.company.project.modules.legal.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** Evidence that a user accepted a version of the terms: who, which version, when. Never updated or deleted. */
@Entity
@Table(name = "terms_acceptances")
public class TermsAcceptanceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(nullable = false, updatable = false)
    private Integer version;

    @Column(name = "accepted_at", nullable = false, updatable = false)
    private Instant acceptedAt;

    protected TermsAcceptanceEntity() {
        // JPA
    }

    public TermsAcceptanceEntity(Long userId, Integer version) {
        this.userId = userId;
        this.version = version;
        this.acceptedAt = Instant.now();
    }

    public Long getUserId() {
        return userId;
    }

    public Integer getVersion() {
        return version;
    }

    public Instant getAcceptedAt() {
        return acceptedAt;
    }
}
