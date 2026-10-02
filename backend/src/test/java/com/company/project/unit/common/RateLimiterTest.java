package com.company.project.unit.common;

import com.company.project.common.RateLimiter;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

/** Covers the sliding-window logic backing AuthController's forgot-password/reset-password rate limits. */
class RateLimiterTest {

    @Test
    void allowsUpToMaxAttemptsThenBlocks() {
        RateLimiter limiter = new RateLimiter();

        assertThat(limiter.tryConsume("key", 3, Duration.ofMinutes(15))).isTrue();
        assertThat(limiter.tryConsume("key", 3, Duration.ofMinutes(15))).isTrue();
        assertThat(limiter.tryConsume("key", 3, Duration.ofMinutes(15))).isTrue();
        assertThat(limiter.tryConsume("key", 3, Duration.ofMinutes(15))).isFalse();
    }

    @Test
    void differentKeysAreTrackedIndependently() {
        RateLimiter limiter = new RateLimiter();

        assertThat(limiter.tryConsume("user-a", 1, Duration.ofMinutes(15))).isTrue();
        assertThat(limiter.tryConsume("user-a", 1, Duration.ofMinutes(15))).isFalse();
        assertThat(limiter.tryConsume("user-b", 1, Duration.ofMinutes(15))).isTrue();
    }

    @Test
    void attemptsOutsideTheWindowDontCountTowardTheLimit() {
        RateLimiter limiter = new RateLimiter();

        assertThat(limiter.tryConsume("key", 1, Duration.ofMillis(50))).isTrue();
        assertThat(limiter.tryConsume("key", 1, Duration.ofMillis(50))).isFalse();

        await(80);

        assertThat(limiter.tryConsume("key", 1, Duration.ofMillis(50))).isTrue();
    }

    private static void await(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }
}
