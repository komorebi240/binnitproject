package com.company.project.modules.onboarding.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * One "send me a registration code" request: first an OTP (attempt-limited), then - once the OTP
 * is right - a single-use verification token that lets exactly one company registration happen
 * for {@code email}. Only SHA-256 hashes of the OTP and the token are stored.
 */
@Entity
@Table(name = "registration_verifications")
public class RegistrationVerificationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String email;

    @Column(name = "otp_hash", nullable = false, length = 64)
    private String otpHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private int attempts = 0;

    @Column(nullable = false)
    private boolean verified = false;

    @Column(name = "token_hash", length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private boolean consumed = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected RegistrationVerificationEntity() {
        // JPA
    }

    public RegistrationVerificationEntity(String email, String otpHash, Instant expiresAt) {
        this.email = email;
        this.otpHash = otpHash;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    public String getEmail() {
        return email;
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

    public boolean isVerified() {
        return verified;
    }

    public boolean isConsumed() {
        return consumed;
    }

    public void recordFailedAttempt() {
        this.attempts++;
    }

    /** OTP accepted: swap the short OTP window for the (longer) window of the verification token. */
    public void markVerified(String tokenHash, Instant tokenExpiresAt) {
        this.verified = true;
        this.tokenHash = tokenHash;
        this.expiresAt = tokenExpiresAt;
    }

    public void markConsumed() {
        this.consumed = true;
    }
}
