package com.company.project.modules.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A single OTP request for the "forgot password" flow. Only {@code otpHash} (SHA-256 of the
 * actual code) is ever stored - see AuthServiceImpl for hashing/verification (CLAUDE.md
 * section 7: never store a credential-like secret in plaintext). No audit columns: this row is
 * short-lived and never shown back to any user, so created_at alone is enough to reason about it.
 */
@Entity
@Table(name = "password_reset_otps")
public class PasswordResetOtpEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "otp_hash", nullable = false, length = 64)
    private String otpHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean used = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected PasswordResetOtpEntity() {
        // JPA
    }

    public PasswordResetOtpEntity(Long userId, String otpHash, Instant expiresAt) {
        this.userId = userId;
        this.otpHash = otpHash;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getOtpHash() {
        return otpHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public boolean isUsed() {
        return used;
    }

    public boolean isValid(String candidateHash, Instant now) {
        return !used && now.isBefore(expiresAt) && otpHash.equals(candidateHash);
    }

    public void markUsed() {
        this.used = true;
    }
}
