package com.company.project.unit.common;

import com.company.project.common.RateLimitGuard;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Security handoff finding #2: a client must not choose its own address for per-address limits by sending X-Forwarded-For.
 * Trusted proxies are resolved before this point by Tomcat's RemoteIpValve (server.forward-headers-strategy: native).
 */
class RateLimitGuardTest {

    @Test
    void clientIp_ignoresAForwardedForHeaderTheClientSentItself() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.7");
        request.addHeader("X-Forwarded-For", "1.2.3.4, 5.6.7.8");

        assertThat(RateLimitGuard.clientIp(request)).isEqualTo("203.0.113.7");
    }

    @Test
    void tooManyRequests_isOneUniformAnswer() {
        var first = RateLimitGuard.tooManyRequests();
        var second = RateLimitGuard.tooManyRequests();

        assertThat(first.getStatus().value()).isEqualTo(429);
        assertThat(first.getCode()).isEqualTo(second.getCode()).isEqualTo("TOO_MANY_REQUESTS");
        assertThat(first.getMessage()).isEqualTo(second.getMessage()).doesNotContainPattern("\\d");
    }
}
