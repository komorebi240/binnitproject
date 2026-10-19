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

    // ---- memory stays bounded (security review: unbounded keys let one address fill the heap)

    @Test
    void aKeyIsDroppedOnceItsLastAttemptLeavesTheWindow() {
        limiter.tryConsume("a", 3, WINDOW);
        limiter.record("b");
        assertThat(limiter.trackedKeys()).isEqualTo(2);

        clock.advance(WINDOW.plusSeconds(1));
        limiter.isExhausted("a", 3, WINDOW);
        limiter.tryConsume("b", 3, WINDOW);

        assertThat(limiter.trackedKeys()).as("a is gone, b holds only its new attempt").isEqualTo(1);
    }

    @Test
    void keysNobodyAsksAboutAgainAreSweptAfterTheLongestWindow() {
        for (int i = 0; i < 500; i++) {
            limiter.tryConsume("stranger-" + i, 3, WINDOW);
        }
        assertThat(limiter.trackedKeys()).isEqualTo(500);

        clock.advance(WINDOW.plusSeconds(1));
        for (int i = 0; i < RateLimiter.SWEEP_EVERY; i++) {
            limiter.isExhausted("someone-else", 3, WINDOW);
        }

        assertThat(limiter.trackedKeys()).as("the periodic sweep removed every expired key").isZero();
    }

    @Test
    void theSweepNeverDropsAttemptsStillInsideTheLongestWindowInUse() {
        Duration hour = Duration.ofHours(1);
        limiter.tryConsume("hourly", 1, hour);
        clock.advance(WINDOW.plusSeconds(1));
        for (int i = 0; i < RateLimiter.SWEEP_EVERY; i++) {
            limiter.isExhausted("someone-else", 3, WINDOW);
        }

        assertThat(limiter.tryConsume("hourly", 1, hour)).as("still counted 16 minutes into its hour").isFalse();
    }

    @Test
    void aVeryLongKeyIsStoredShortButStillCountedOnItsOwn() {
        String longA = "forgot-password:user:" + "u".repeat(1_000_000) + "A";
        String longB = "forgot-password:user:" + "u".repeat(1_000_000) + "B";

        assertThat(limiter.tryConsume(longA, 1, WINDOW)).isTrue();
        assertThat(limiter.tryConsume(longA, 1, WINDOW)).as("the same long key is counted together").isFalse();
        assertThat(limiter.tryConsume(longB, 1, WINDOW)).as("a different long key is counted apart").isTrue();
        assertThat(limiter.trackedKeys()).isEqualTo(2);
    }

    @Test
    void whenFullNewKeysAreRefusedButKnownKeysKeepTheirAllowance() {
        RateLimiter small = new RateLimiter(clock, 3);
        small.tryConsume("a", 5, WINDOW);
        small.tryConsume("b", 5, WINDOW);
        small.record("c");

        assertThat(small.tryConsume("d", 5, WINDOW)).as("no room: refused, never unlimited").isFalse();
        assertThat(small.isExhausted("e", 5, WINDOW)).as("an untracked key counts as exhausted while full").isTrue();
        assertThat(small.tryConsume("a", 5, WINDOW)).as("a tracked key still works").isTrue();
        assertThat(small.trackedKeys()).isEqualTo(3);

        clock.advance(WINDOW.plusSeconds(1));
        assertThat(small.tryConsume("d", 5, WINDOW)).as("room again once the old keys expired").isTrue();
    }
}
