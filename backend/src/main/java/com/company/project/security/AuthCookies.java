package com.company.project.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;

/** The httpOnly session cookie, shared by login and the flows that sign a new user straight in. */
public final class AuthCookies {

    private AuthCookies() {
    }

    public static void issue(HttpServletResponse response, JwtService jwtService, UserPrincipal principal) {
        ResponseCookie cookie = ResponseCookie.from(JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE, jwtService.generateAccessToken(principal))
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(jwtService.accessTokenTtlSeconds())
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
