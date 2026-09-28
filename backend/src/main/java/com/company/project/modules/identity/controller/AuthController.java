package com.company.project.modules.identity.controller;

import com.company.project.common.ApiResponse;
import com.company.project.modules.identity.dto.request.LoginRequest;
import com.company.project.modules.identity.dto.response.UserProfileResponse;
import com.company.project.modules.identity.service.AuthService;
import com.company.project.security.JwtAuthenticationFilter;
import com.company.project.security.JwtService;
import com.company.project.security.UserPrincipal;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Issues the session as an httpOnly cookie rather than a token in the response body — see
 * frontend/src/lib/api/client.ts and its README for why (XSS token-theft mitigation).
 *
 * Uses SameSite=Lax, not Strict as originally planned: Lax already blocks the cookie on any
 * cross-SITE state-changing request (POST/PUT/DELETE), which is the actual CSRF threat —
 * Strict's only extra restriction is blocking top-level cross-site GET navigation, which
 * isn't a CSRF vector and would otherwise risk odd edge cases across the frontend's
 * localhost:3000 and backend's localhost:8080 ports during local dev.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ApiResponse<UserProfileResponse> login(
            @Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        UserPrincipal principal = authService.authenticate(request.username(), request.password());
        String token = jwtService.generateAccessToken(principal);

        ResponseCookie cookie = ResponseCookie.from(JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE, token)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(jwtService.accessTokenTtlSeconds())
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ApiResponse.success(authService.getProfile(principal));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return ApiResponse.success(null);
    }

    @GetMapping("/me")
    public ApiResponse<UserProfileResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.success(authService.getProfile(principal));
    }
}
