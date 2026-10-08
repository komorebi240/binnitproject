package com.company.project.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bound from `app.jwt.*` in application.yml. Secret is supplied via environment variable
 * (see application.yml) - never hard-coded (CLAUDE.md section 30).
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        String secret,
        long accessTokenTtlMinutes,
        boolean cookieSecure
) {
}
