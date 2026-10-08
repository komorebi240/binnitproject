package com.company.project.config;

import com.company.project.security.SessionProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/** The clock time-dependent rules read (sessions), so tests can fix it; and the settings of those rules. */
@Configuration
@EnableConfigurationProperties(SessionProperties.class)
public class TimeConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
