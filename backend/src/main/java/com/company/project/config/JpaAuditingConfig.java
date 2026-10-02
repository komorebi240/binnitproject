package com.company.project.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/**
 * Without @EnableJpaAuditing, @CreatedDate/@CreatedBy on an entity are silently never
 * populated - Hibernate then inserts NULL into a NOT NULL audit column and the insert fails
 * at the database, not at the annotation. This was caught by actually running the reference
 * `sample` feature end to end, not by reading the entity code.
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaAuditingConfig {

    private static final String SYSTEM_AUDITOR = "system";

    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return Optional.of(SYSTEM_AUDITOR);
            }
            return Optional.ofNullable(authentication.getName()).or(() -> Optional.of(SYSTEM_AUDITOR));
        };
    }
}
