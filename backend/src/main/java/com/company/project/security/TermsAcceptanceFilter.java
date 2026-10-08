package com.company.project.security;

import com.company.project.common.ApiError;
import com.company.project.common.ApiResponse;
import com.company.project.modules.legal.service.TermsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Nobody may use the product until they have accepted the newest terms of service: every authenticated request from a
 * user who has not is answered with 403 {@code TERMS_NOT_ACCEPTED}. The frontend shows a window with the terms when it
 * sees that (or when the profile says so), but the rule lives here so that skipping the window - calling the API
 * directly - does not skip the terms (CLAUDE.md section 9: the frontend is never the control).
 *
 * <p>Exempt: signing in and out, reading who I am, and the terms endpoints themselves; without those a person could
 * neither accept nor leave.
 */
@Component
public class TermsAcceptanceFilter extends OncePerRequestFilter {

    private static final String AUTH_PREFIX = "/api/v1/auth/";
    private static final String TERMS_PREFIX = "/api/v1/terms/";

    private final TermsService termsService;
    private final ObjectMapper objectMapper;

    public TermsAcceptanceFilter(TermsService termsService, ObjectMapper objectMapper) {
        this.termsService = termsService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || path.startsWith(AUTH_PREFIX)
                || path.startsWith(TERMS_PREFIX)
                || path.startsWith("/actuator/");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal
                && !termsService.hasAcceptedCurrent(principal.getUserId())) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            ApiResponse<Void> body = ApiResponse.failure(
                    new ApiError("TERMS_NOT_ACCEPTED", "You must accept the current terms of service to continue"));
            response.getWriter().write(objectMapper.writeValueAsString(body));
            return;
        }
        filterChain.doFilter(request, response);
    }
}
