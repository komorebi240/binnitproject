package com.company.project.modules.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Duration;
import java.time.Instant;

/**
 * One sign-in of one person on one browser. Only {@code tokenHash} (SHA-256 of the random token in the cookie) is stored,
 * never the token (CLAUDE.md section 7). No audit columns: the row is technical, never shown to anyone, and removed once dead.
 */
@Entity
@Table(name = "auth_sessions")
public class AuthSessionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(name = "token_hash", nullable = false, updatable = false, length = 64)
    private String tokenHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "last_activity_at", nullable = false)
    private Instant lastActivityAt;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    protected AuthSessionEntity() {
        // JPA
    }

    public AuthSessionEntity(Long userId, String tokenHash, Instant now, Instant expiresAt) {
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.createdAt = now;
        this.lastActivityAt = now;
        this.expiresAt = expiresAt;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Instant getLastActivityAt() {
        return lastActivityAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    /** Alive = before its absolute expiry and the person did something within the idle timeout. */
    public boolean isAlive(Instant now, Duration idleTimeout) {
        return now.isBefore(expiresAt) && now.isBefore(lastActivityAt.plus(idleTimeout));
    }

    public void recordActivity(Instant now) {
        this.lastActivityAt = now;
    }
}
