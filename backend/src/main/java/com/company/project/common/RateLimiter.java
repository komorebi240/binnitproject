package com.company.project.common;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * In-memory sliding-window rate limiter - per-key attempt counting, no external dependency
 * (CLAUDE.md section 29: don't add Redis for a single-instance dev deployment). Keyed by
 * whatever the caller chooses (username, IP, a composite of both) so the same limiter instance
 * can back several unrelated checks.
 *
 * Not safe across multiple application instances - state is held in memory only. If this app is
 * ever horizontally scaled, replace with a shared store (Redis `INCR`+`EXPIRE` is the standard
 * pattern) so limits are enforced per account/IP globally, not per instance. Sign-in failures of
 * existing accounts are additionally counted in the database (LoginProtectionService) for this reason.
 */
@Component
public class RateLimiter {

    private final ConcurrentHashMap<String, Deque<Instant>> attemptsByKey = new ConcurrentHashMap<>();
    private final Clock clock;

    public RateLimiter(Clock clock) {
        this.clock = clock;
    }

    /**
     * Records one attempt for {@code key} and reports whether it's within {@code maxAttempts}
     * inside the trailing {@code window}. Attempts older than the window are pruned on every
     * call, so memory doesn't grow unbounded for keys that stop being used.
     */
    public boolean tryConsume(String key, int maxAttempts, Duration window) {
        Instant now = clock.instant();
        Deque<Instant> attempts = attemptsByKey.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());

        synchronized (attempts) {
            prune(attempts, now.minus(window));
            if (attempts.size() >= maxAttempts) {
                return false;
            }
            attempts.addLast(now);
            return true;
        }
    }

    /** Whether {@code key} already has {@code maxAttempts} recorded inside the trailing window - without recording one. */
    public boolean isExhausted(String key, int maxAttempts, Duration window) {
        Deque<Instant> attempts = attemptsByKey.get(key);
        if (attempts == null) {
            return false;
        }
        synchronized (attempts) {
            prune(attempts, clock.instant().minus(window));
            return attempts.size() >= maxAttempts;
        }
    }

    /** Records one attempt for {@code key}, for checks that count only some outcomes (failed sign-ins) - see isExhausted. */
    public void record(String key) {
        Deque<Instant> attempts = attemptsByKey.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());
        synchronized (attempts) {
            attempts.addLast(clock.instant());
        }
    }

    public void clear(String key) {
        attemptsByKey.remove(key);
    }

    private static void prune(Deque<Instant> attempts, Instant windowStart) {
        while (!attempts.isEmpty() && attempts.peekFirst().isBefore(windowStart)) {
            attempts.pollFirst();
        }
    }
}
