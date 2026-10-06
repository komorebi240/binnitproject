package com.company.project.modules.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A pending change of a staff member's email: the code goes to the NEW address and the change only
 * happens once it is confirmed. Only the SHA-256 of the code is stored.
 */
@Entity
@Table(name = "email_change_requests")
public class EmailChangeRequestEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "new_email", nullable = false, length = 200)
    private String newEmail;

    @Column(name = "otp_hash", nullable = false, length = 64)
    private String otpHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private int attempts = 0;

    @Column(nullable = false)
    private boolean consumed = false;

    @Column(name = "requested_by_user_id", nullable = false)
    private Long requestedByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected EmailChangeRequestEntity() {
        // JPA
    }

    public EmailChangeRequestEntity(Long userId, String newEmail, String otpHash, Instant expiresAt, Long requestedByUserId) {
        this.userId = userId;
        this.newEmail = newEmail;
        this.otpHash = otpHash;
        this.expiresAt = expiresAt;
        this.requestedByUserId = requestedByUserId;
        this.createdAt = Instant.now();
    }

    public String getNewEmail() {
        return newEmail;
    }

    public String getOtpHash() {
        return otpHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public int getAttempts() {
        return attempts;
    }

    public void recordFailedAttempt() {
        this.attempts++;
    }

    public void markConsumed() {
        this.consumed = true;
    }
}
