package com.company.project.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CORS is restricted to an explicit, configured origin list — never "*" once credentials
 * (Authorization header / cookies) are involved (CLAUDE.md section 13, misconfigured CORS).
 *
 * This is exposed as a CorsConfigurationSource bean (not a WebMvcConfigurer mapping) so
 * SecurityConfig can apply it via HttpSecurity.cors(...). A WebMvcConfigurer-only mapping
 * runs inside DispatcherServlet, which is too late: Spring Security's filter chain sees the
 * browser's CORS preflight (OPTIONS) request first and — with no cors() config of its own —
 * rejects it as an unauthenticated request, so the browser never sends the real request at all.
 */
@Configuration
public class WebConfig {

    @Value("${app.cors.allowed-origins}")
    private String[] allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(allowedOrigins));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
