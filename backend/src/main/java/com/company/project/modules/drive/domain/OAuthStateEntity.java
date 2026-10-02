package com.company.project.modules.drive.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Short-lived CSRF correlation for the OAuth redirect round trip: /drive/connect creates one,
 * /drive/oauth2/callback consumes it and deletes it. Not a business record - no audit columns,
 * checked against a TTL in {@code DriveConnectionService} rather than relying on the caller
 * still being authenticated when Google redirects back (CLAUDE.md section 13 - OAuth CSRF).
 */
@Entity
@Table(name = "oauth_states")
public class OAuthStateEntity {

    @Id
    @Column(length = 100)
    private String state;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected OAuthStateEntity() {
        // JPA
    }

    public OAuthStateEntity(String state, Long userId) {
        this.state = state;
        this.userId = userId;
        this.createdAt = Instant.now();
    }

    public String getState() {
        return state;
    }

    public Long getUserId() {
        return userId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
