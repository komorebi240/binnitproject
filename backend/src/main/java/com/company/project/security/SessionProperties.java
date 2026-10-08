package com.company.project.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bound from {@code app.session.*}: how long a sign-in lasts without any action by the person, and the longest it can last
 * at all. The browser tells the server about real actions (mouse, keyboard); the tab's own background polling does not count.
 */
@ConfigurationProperties(prefix = "app.session")
public record SessionProperties(long idleTimeoutMinutes, long maxAgeDays) {
}
