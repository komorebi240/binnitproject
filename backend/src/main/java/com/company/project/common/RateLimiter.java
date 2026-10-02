package com.company.project.common;

import org.springframework.stereotype.Component;

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
 * pattern) so limits are enforced per account/IP globally, not per instance.
 */
@Component
public class RateLimiter {

    private final ConcurrentHashMap<String, Deque<Instant>> attemptsByKey = new ConcurrentHashMap<>();

    /**
     * Records one attempt for {@code key} and reports whether it's within {@code maxAttempts}
     * inside the trailing {@code window}. Attempts older than the window are pruned on every
     * call, so memory doesn't grow unbounded for keys that stop being used.
     */
    public boolean tryConsume(String key, int maxAttempts, Duration window) {
        Instant now = Instant.now();
        Instant windowStart = now.minus(window);
        Deque<Instant> attempts = attemptsByKey.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());

        synchronized (attempts) {
            while (!attempts.isEmpty() && attempts.peekFirst().isBefore(windowStart)) {
                attempts.pollFirst();
            }
            if (attempts.size() >= maxAttempts) {
                return false;
            }
            attempts.addLast(now);
            return true;
        }
    }
}
