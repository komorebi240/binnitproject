package com.company.project.security;

import com.company.project.modules.identity.service.SessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Reads the access-token cookie (matches the frontend's httpOnly-cookie convention - see
 * frontend/src/lib/api/client.ts and its README), validates the JWT, and populates the
 * SecurityContext with a full UserPrincipal built from the token's claims. When the token is missing or has expired but
 * the session cookie matches a live session, the person is read fresh from the database and a new access token is issued -
 * that is how a sign-in lasts until two hours without action rather than 15 minutes. The backend never trusts an
 * identity claimed directly by the client outside these two tokens (CLAUDE.md section 8).
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** {@code __Host-}: only this exact host, over HTTPS, may set it - a sibling subdomain cannot plant or overwrite it. */
    public static final String ACCESS_TOKEN_COOKIE = "__Host-access_token";

    private final JwtService jwtService;
    private final SessionService sessionService;
    private final SessionCookies sessionCookies;

    public JwtAuthenticationFilter(JwtService jwtService, SessionService sessionService, SessionCookies sessionCookies) {
        this.jwtService = jwtService;
        this.sessionService = sessionService;
        this.sessionCookies = sessionCookies;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String accessToken = SessionCookies.read(request, ACCESS_TOKEN_COOKIE);
        UserPrincipal principal = accessToken == null ? null : jwtService.parsePrincipal(accessToken);

        if (principal == null) {
            principal = resumeSession(request, response);
        }

        if (principal != null && principal.isEnabled()) {
            var authentication = new UsernamePasswordAuthenticationToken(
                    principal, null, principal.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private UserPrincipal resumeSession(HttpServletRequest request, HttpServletResponse response) {
        String sessionToken = SessionCookies.sessionToken(request);
        if (sessionToken == null) {
            return null;
        }
        UserPrincipal principal = sessionService.resume(sessionToken).orElse(null);
        if (principal == null) {
            // Ended, idle too long or account switched off: stop the browser presenting it (and /login stops forwarding to the app).
            sessionCookies.clearSessionToken(response);
            return null;
        }
        sessionCookies.issueAccessToken(response, principal);
        return principal;
    }
}
