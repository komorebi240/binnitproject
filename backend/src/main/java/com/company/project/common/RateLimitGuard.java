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
            throw tooManyRequests();
        }
    }

    /** The one answer for every limit: the same code and text, and never how many attempts are left. */
    public static BusinessException tooManyRequests() {
        return new BusinessException(
                "TOO_MANY_REQUESTS", "Too many attempts. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }

    /**
     * The client's address for per-address limits. Never read X-Forwarded-For here: a client can put anything in it.
     * Tomcat's RemoteIpValve (server.forward-headers-strategy: native) has already replaced the remote address with the
     * real client's, reading X-Forwarded-For only from the trusted proxies in server.tomcat.remoteip.internal-proxies
     * (right to left, so an address a client prepended is ignored).
     */
    public static String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
