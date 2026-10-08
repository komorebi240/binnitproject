package com.company.project.modules.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Duration;
import java.time.Instant;

/**
 * Recent failed sign-ins of one account, counted in a fixed window: the first failure opens the window, later failures inside
 * it add up, a failure after it starts a new one. No audit columns: the row is technical and deleted on success.
 */
@Entity
@Table(name = "login_failures")
public class LoginFailureEntity {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "failure_count", nullable = false)
    private int failureCount;

    @Column(name = "window_started_at", nullable = false)
    private Instant windowStartedAt;

    protected LoginFailureEntity() {
        // JPA
    }

    public LoginFailureEntity(Long userId, Instant now) {
        this.userId = userId;
        this.failureCount = 1;
        this.windowStartedAt = now;
    }

    public void registerFailure(Instant now, Duration window) {
        if (!now.isBefore(windowStartedAt.plus(window))) {
            failureCount = 1;
            windowStartedAt = now;
        } else {
            failureCount++;
        }
    }

    /** Blocked = this many failures or more, and the window they happened in has not ended yet. */
    public boolean isBlocked(Instant now, int maxFailures, Duration window) {
        return failureCount >= maxFailures && now.isBefore(windowStartedAt.plus(window));
    }

    public int getFailureCount() {
        return failureCount;
    }
}
