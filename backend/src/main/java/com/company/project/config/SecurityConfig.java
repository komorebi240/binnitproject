package com.company.project.config;

import com.company.project.security.JwtAuthenticationFilter;
import com.company.project.security.RestAccessDeniedHandler;
import com.company.project.security.RestAuthenticationEntryPoint;
import com.company.project.security.TermsAcceptanceFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.CorsUtils;

/**
 * Stateless JWT-based (cookie-carried) security. @EnableMethodSecurity turns on @PreAuthorize
 * for coarse-grained, authority-tier checks - fine-grained scope checks (does this department
 * actually belong to the caller's company?) still happen in the service layer, never here
 * (CLAUDE.md section 9).
 *
 * Unlike the previous scaffold version, this now has a real UserDetailsService
 * (CustomUserDetailsService, module identity) so AuthenticationManager/DaoAuthenticationProvider
 * can be wired without the "no UserDetailsService" startup crash documented in backend/README.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final TermsAcceptanceFilter termsAcceptanceFilter;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;
    private final CorsConfigurationSource corsConfigurationSource;
    private final UserDetailsService userDetailsService;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            TermsAcceptanceFilter termsAcceptanceFilter,
            RestAuthenticationEntryPoint authenticationEntryPoint,
            RestAccessDeniedHandler accessDeniedHandler,
            CorsConfigurationSource corsConfigurationSource,
            UserDetailsService userDetailsService
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.termsAcceptanceFilter = termsAcceptanceFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
        this.corsConfigurationSource = corsConfigurationSource;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                // No CSRF token: the session cookies are SameSite=Lax, so another site's POST/PUT/PATCH/DELETE never carries
                // them, and the CORS check below rejects (403) any request whose Origin is not an allowed one - which is what
                // stops a page on a sibling subdomain (same site, so Lax lets the cookies through). See CorsCsrfDefenseTest.
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint) // -> 401 envelope, not the default blank 403
                        .accessDeniedHandler(accessDeniedHandler)
                )
                .authorizeHttpRequests(auth -> auth
                        // Without this, the browser's CORS preflight (OPTIONS) falls through to
                        // anyRequest().authenticated(), gets rejected as unauthenticated, and the
                        // browser never sends the real request at all - see WebConfig's javadoc.
                        .requestMatchers(CorsUtils::isPreFlightRequest).permitAll()
                        .requestMatchers("/api/v1/auth/login", "/api/v1/auth/logout").permitAll()
                        // Must be reachable while logged out - see AuthController javadoc on
                        // each endpoint for why the response never reveals account existence.
                        .requestMatchers("/api/v1/auth/forgot-password", "/api/v1/auth/reset-password").permitAll()
                        .requestMatchers("/api/v1/auth/register/**", "/api/v1/auth/invitations/**").permitAll()
                        // The terms are shown before an account exists; accepting (POST) still needs a session.
                        .requestMatchers("/api/v1/terms/current").permitAll()
                        // Google's redirect back to us - resolves the user from the `state`
                        // row it looks up itself, not from the caller's own auth (see
                        // DriveConnectionController's javadoc).
                        .requestMatchers("/api/v1/drive/oauth2/callback").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        // "/swagger-ui/**" alone does not match the literal "/swagger-ui.html" entry point.
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/v3/api-docs.yaml").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                // After the identity is known: a user who has not accepted the newest terms may do nothing else.
                .addFilterAfter(termsAcceptanceFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        // Instantiated directly (not the passwordEncoder() bean below) to avoid a circular
        // dependency: this class can't require its own @Bean method's output as a constructor
        // argument. BCryptPasswordEncoder() has no state beyond a fixed default strength, so
        // this and the injectable bean behave identically.
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(new BCryptPasswordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
