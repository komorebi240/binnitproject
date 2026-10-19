package com.company.project.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * In-memory sliding-window rate limiter - per-key attempt counting, no external dependency
 * (CLAUDE.md section 29: don't add Redis for a single-instance dev deployment). Keyed by
 * whatever the caller chooses (username, IP, a composite of both) so the same limiter instance
 * can back several unrelated checks.
 *
 * Memory is bounded even under attack, because keys often come from what a stranger types: a key is dropped as soon as
 * its last attempt leaves the window; every {@link #SWEEP_EVERY} operations the whole map is swept of keys whose
 * attempts are all older than the longest window in use (a key nobody asks about again would otherwise stay forever); a
 * key longer than {@link #MAX_KEY_LENGTH} is stored as a digest; and at most {@code maxKeys} keys are tracked - when
 * full, new keys are refused (fails closed: a 429, never an unlimited allowance) until the sweep frees room.
 *
 * Not safe across multiple application instances - state is held in memory only. If this app is
 * ever horizontally scaled, replace with a shared store (Redis `INCR`+`EXPIRE` is the standard
 * pattern) so limits are enforced per account/IP globally, not per instance. Sign-in failures of
 * existing accounts are additionally counted in the database (LoginProtectionService) for this reason.
 */
@Component
public class RateLimiter {

    public static final int DEFAULT_MAX_KEYS = 100_000;
    public static final int MAX_KEY_LENGTH = 200;
    public static final int SWEEP_EVERY = 1_000;
    private static final Duration FULL_WARNING_INTERVAL = Duration.ofMinutes(1);
    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

    /** Every deque is read and changed only inside compute/computeIfPresent, which ConcurrentHashMap runs atomically per key. */
    private final ConcurrentHashMap<String, Deque<Instant>> attemptsByKey = new ConcurrentHashMap<>();
    private final AtomicLong operations = new AtomicLong();
    private final AtomicReference<Duration> longestWindow = new AtomicReference<>(Duration.ZERO);
    private final AtomicReference<Instant> lastFullWarning = new AtomicReference<>(Instant.MIN);
    private final Clock clock;
    private final int maxKeys;

    @Autowired
    public RateLimiter(Clock clock) {
        this(clock, DEFAULT_MAX_KEYS);
    }

    public RateLimiter(Clock clock, int maxKeys) {
        this.clock = clock;
        this.maxKeys = maxKeys;
    }

    /**
     * Records one attempt for {@code key} and reports whether it's within {@code maxAttempts}
     * inside the trailing {@code window}.
     */
    public boolean tryConsume(String key, int maxAttempts, Duration window) {
        Instant now = beginOperation(window);
        String storedKey = bounded(key);
        if (refusesNewKey(storedKey, now)) {
            return false;
        }
        boolean[] allowed = {false};
        attemptsByKey.compute(storedKey, (k, existing) -> {
            Deque<Instant> attempts = existing == null ? new ArrayDeque<>() : existing;
            prune(attempts, now.minus(window));
            if (attempts.size() < maxAttempts) {
                attempts.addLast(now);
                allowed[0] = true;
            }
            return attempts.isEmpty() ? null : attempts;
        });
        return allowed[0];
    }

    /** Whether {@code key} already has {@code maxAttempts} recorded inside the trailing window - without recording one. */
    public boolean isExhausted(String key, int maxAttempts, Duration window) {
        Instant now = beginOperation(window);
        String storedKey = bounded(key);
        if (refusesNewKey(storedKey, now)) {
            return true;
        }
        boolean[] exhausted = {false};
        attemptsByKey.computeIfPresent(storedKey, (k, attempts) -> {
            prune(attempts, now.minus(window));
            exhausted[0] = attempts.size() >= maxAttempts;
            return attempts.isEmpty() ? null : attempts;
        });
        return exhausted[0];
    }

    /** Records one attempt for {@code key}, for checks that count only some outcomes (failed sign-ins) - see isExhausted. */
    public void record(String key) {
        Instant now = beginOperation(Duration.ZERO);
        String storedKey = bounded(key);
        if (refusesNewKey(storedKey, now)) {
            return;
        }
        attemptsByKey.compute(storedKey, (k, existing) -> {
            Deque<Instant> attempts = existing == null ? new ArrayDeque<>() : existing;
            attempts.addLast(now);
            return attempts;
        });
    }

    public void clear(String key) {
        attemptsByKey.remove(bounded(key));
    }

    /** How many keys are tracked right now (monitoring and tests). */
    public int trackedKeys() {
        return attemptsByKey.size();
    }

    private Instant beginOperation(Duration window) {
        Instant now = clock.instant();
        longestWindow.accumulateAndGet(window, (current, candidate) -> candidate.compareTo(current) > 0 ? candidate : current);
        if (operations.incrementAndGet() % SWEEP_EVERY == 0) {
            sweep(now);
        }
        return now;
    }

    /** A key that is not tracked yet is refused only while the map is full even after a sweep. */
    private boolean refusesNewKey(String storedKey, Instant now) {
        if (attemptsByKey.size() < maxKeys || attemptsByKey.containsKey(storedKey)) {
            return false;
        }
        sweep(now);
        if (attemptsByKey.size() < maxKeys) {
            return false;
        }
        Instant last = lastFullWarning.get();
        if (now.isAfter(last.plus(FULL_WARNING_INTERVAL)) && lastFullWarning.compareAndSet(last, now)) {
            log.warn("Rate limiter is full ({} keys): new keys are refused until older ones expire", maxKeys);
        }
        return true;
    }

    /** Drops every attempt older than the longest window any caller uses, and the keys left empty. */
    private void sweep(Instant now) {
        Instant cutoff = now.minus(longestWindow.get());
        for (String key : attemptsByKey.keySet()) {
            attemptsByKey.computeIfPresent(key, (k, attempts) -> {
                prune(attempts, cutoff);
                return attempts.isEmpty() ? null : attempts;
            });
        }
    }

    private static void prune(Deque<Instant> attempts, Instant windowStart) {
        while (!attempts.isEmpty() && attempts.peekFirst().isBefore(windowStart)) {
            attempts.pollFirst();
        }
    }

    /** Callers bound their input, but a key must never be able to grow without limit: a long one is kept as a digest. */
    private static String bounded(String key) {
        if (key.length() <= MAX_KEY_LENGTH) {
            return key;
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8));
            return key.substring(0, 64) + "#" + HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required by the Java platform", e);
        }
    }
}
