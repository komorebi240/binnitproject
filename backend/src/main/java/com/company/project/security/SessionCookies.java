package com.company.project.security;

import com.company.project.modules.identity.service.SessionService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * The two httpOnly cookies of a sign-in: the short-lived access token (JWT, 15 minutes, carries the claims every request is
 * authorised from) and the session token (random, lives as long as the longest a session may, checked against the server's
 * session table). When the access token has expired the session token silently gets a new one - see
 * {@link JwtAuthenticationFilter}. Shared by login and the flows that sign a new user straight in.
 */
@Component
public class SessionCookies {

    public static final String SESSION_COOKIE = "orbit_session";

    private final JwtService jwtService;
    private final SessionService sessionService;
    private final SessionProperties sessionProperties;

    public SessionCookies(JwtService jwtService, SessionService sessionService, SessionProperties sessionProperties) {
        this.jwtService = jwtService;
        this.sessionService = sessionService;
        this.sessionProperties = sessionProperties;
    }

    /** Starts a session for a person who has just proved who they are and sets both cookies. */
    public void signIn(HttpServletResponse response, UserPrincipal principal) {
        String sessionToken = sessionService.start(principal.getUserId());
        issueAccessToken(response, principal);
        add(response, SESSION_COOKIE, sessionToken, Duration.ofDays(sessionProperties.maxAgeDays()).toSeconds());
    }

    public void issueAccessToken(HttpServletResponse response, UserPrincipal principal) {
        add(response, JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE, jwtService.generateAccessToken(principal), jwtService.accessTokenTtlSeconds());
    }

    /** Ends the session on the server and removes both cookies; works for a caller whose access token has already expired. */
    public void signOut(HttpServletRequest request, HttpServletResponse response) {
        sessionService.end(read(request, SESSION_COOKIE));
        add(response, JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE, "", 0);
        clearSessionToken(response);
    }

    /** Tells the browser to stop presenting a session token that no longer matches a live session. */
    public void clearSessionToken(HttpServletResponse response) {
        add(response, SESSION_COOKIE, "", 0);
    }

    public static String sessionToken(HttpServletRequest request) {
        return read(request, SESSION_COOKIE);
    }

    public static String read(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private static void add(HttpServletResponse response, String name, String value, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAgeSeconds)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
