package com.company.project.common;

import com.company.project.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** Throws 429 when a key exceeds its allowance; shared by controllers that expose public endpoints. */
@Component
public class RateLimitGuard {

    private final RateLimiter rateLimiter;

    public RateLimitGuard(RateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    public void enforce(String key, int maxAttempts, Duration window) {
        if (!rateLimiter.tryConsume(key, maxAttempts, window)) {
            throw new BusinessException(
                    "TOO_MANY_REQUESTS", "Too many attempts. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    /** X-Forwarded-For-aware client IP (this app sits behind a proxy in a real deployment). */
    public static String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
