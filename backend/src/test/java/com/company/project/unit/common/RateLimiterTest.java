package com.company.project.unit.common;

import com.company.project.common.RateLimiter;
import com.company.project.unit.support.MutableClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/** Covers the sliding-window logic backing the public endpoints' rate limits and the sign-in failure counts. */
class RateLimiterTest {

    private static final Duration WINDOW = Duration.ofMinutes(15);

    private MutableClock clock;
    private RateLimiter limiter;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-10-08T08:00:00Z"));
        limiter = new RateLimiter(clock);
    }

    @Test
    void allowsUpToMaxAttemptsThenBlocks() {
        assertThat(limiter.tryConsume("key", 3, WINDOW)).isTrue();
        assertThat(limiter.tryConsume("key", 3, WINDOW)).isTrue();
        assertThat(limiter.tryConsume("key", 3, WINDOW)).isTrue();
        assertThat(limiter.tryConsume("key", 3, WINDOW)).isFalse();
    }

    @Test
    void differentKeysAreTrackedIndependently() {
        assertThat(limiter.tryConsume("user-a", 1, WINDOW)).isTrue();
        assertThat(limiter.tryConsume("user-a", 1, WINDOW)).isFalse();
        assertThat(limiter.tryConsume("user-b", 1, WINDOW)).isTrue();
    }

    @Test
    void attemptsOutsideTheWindowDontCountTowardTheLimit() {
        assertThat(limiter.tryConsume("key", 1, WINDOW)).isTrue();
        assertThat(limiter.tryConsume("key", 1, WINDOW)).isFalse();

        clock.advance(WINDOW.plusSeconds(1));

        assertThat(limiter.tryConsume("key", 1, WINDOW)).isTrue();
    }

    @Test
    void isExhaustedOnlyLooksAndRecordOnlyCounts() {
        for (int i = 0; i < 10; i++) {
            assertThat(limiter.isExhausted("key", 2, WINDOW)).as("looking never counts").isFalse();
        }
        limiter.record("key");
        assertThat(limiter.isExhausted("key", 2, WINDOW)).isFalse();
        limiter.record("key");
        assertThat(limiter.isExhausted("key", 2, WINDOW)).isTrue();
        assertThat(limiter.isExhausted("unknown-key", 2, WINDOW)).isFalse();
    }

    @Test
    void recordedAttemptsExpireWithTheWindowAndClearForgetsThem() {
        limiter.record("a");
        limiter.record("a");
        clock.advance(WINDOW.minusSeconds(1));
        assertThat(limiter.isExhausted("a", 2, WINDOW)).isTrue();
        clock.advance(Duration.ofSeconds(2));
        assertThat(limiter.isExhausted("a", 2, WINDOW)).as("both attempts left the window").isFalse();

        limiter.record("b");
        limiter.record("b");
        limiter.clear("b");
        assertThat(limiter.isExhausted("b", 2, WINDOW)).isFalse();
    }
}
