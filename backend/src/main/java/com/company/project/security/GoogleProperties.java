package com.company.project.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bound from `app.google.*`. clientId/clientSecret come from environment variables (see
 * application.yml) - never hard-coded (CLAUDE.md section 30). See backend/README.md for the
 * step-by-step guide to create these in Google Cloud Console.
 */
@ConfigurationProperties(prefix = "app.google")
public record GoogleProperties(
        String clientId,
        String clientSecret,
        String redirectUri
) {
}
