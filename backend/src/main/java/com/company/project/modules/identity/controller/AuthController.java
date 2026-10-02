package com.company.project.modules.identity.controller;

import com.company.project.common.ApiResponse;
import com.company.project.common.RateLimiter;
import com.company.project.common.exception.BusinessException;
import com.company.project.modules.identity.dto.request.ChangePasswordRequest;
import com.company.project.modules.identity.dto.request.ForgotPasswordRequest;
import com.company.project.modules.identity.dto.request.LoginRequest;
import com.company.project.modules.identity.dto.request.ResetPasswordRequest;
import com.company.project.modules.identity.dto.request.UpdatePresenceRequest;
import com.company.project.modules.identity.dto.request.UpdateProfileRequest;
import com.company.project.modules.identity.dto.response.UserProfileResponse;
import com.company.project.modules.identity.service.AuthService;
import com.company.project.security.AuthCookies;
import com.company.project.security.JwtAuthenticationFilter;
import com.company.project.security.JwtService;
import com.company.project.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;

/**
 * Issues the session as an httpOnly cookie rather than a token in the response body - see
 * frontend/src/lib/api/client.ts and its README for why (XSS token-theft mitigation).
 *
 * Uses SameSite=Lax, not Strict as originally planned: Lax already blocks the cookie on any
 * cross-SITE state-changing request (POST/PUT/DELETE), which is the actual CSRF threat -
 * Strict's only extra restriction is blocking top-level cross-site GET navigation, which
 * isn't a CSRF vector and would otherwise risk odd edge cases across the frontend's
 * localhost:3000 and backend's localhost:8080 ports during local dev.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final RateLimiter rateLimiter;

    public AuthController(AuthService authService, JwtService jwtService, RateLimiter rateLimiter) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/login")
    public ApiResponse<UserProfileResponse> login(
            @Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        UserPrincipal principal = authService.authenticate(request.username(), request.password());
        AuthCookies.issue(response, jwtService, principal);

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

    @PatchMapping("/me")
    public ApiResponse<UserProfileResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.success(authService.updateProfile(principal, request));
    }

    @PostMapping(value = "/me/avatar", consumes = "multipart/form-data")
    public ApiResponse<UserProfileResponse> uploadAvatar(
            @RequestParam("file") MultipartFile file, @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.success(authService.uploadAvatar(principal, file));
    }

    @PostMapping("/me/onboarding/complete")
    public ApiResponse<UserProfileResponse> completeOnboarding(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.success(authService.completeOnboarding(principal));
    }

    @PatchMapping("/me/presence")
    public ApiResponse<UserProfileResponse> updatePresence(
            @Valid @RequestBody UpdatePresenceRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.success(authService.updatePresence(principal, request.status()));
    }

    @PatchMapping("/password")
    public ApiResponse<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        authService.changePassword(principal, request.currentPassword(), request.newPassword());
        return ApiResponse.success(null);
    }

    /**
     * Public - see SecurityConfig. Always returns the same generic success regardless of
     * username. Rate-limited by both the caller's IP (generic abuse - one source can't hammer
     * every username) and the target username (targeted abuse - one username's inbox can't be
     * spammed with OTP emails from many different IPs).
     */
    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request, HttpServletRequest httpRequest) {
        enforceRateLimit("forgot-password:ip:" + clientIp(httpRequest), 10, Duration.ofMinutes(15));
        enforceRateLimit("forgot-password:user:" + request.username(), 3, Duration.ofMinutes(15));
        authService.requestPasswordReset(request.username());
        return ApiResponse.success(null);
    }

    /**
     * Public - see SecurityConfig. Rate-limited per username since the real risk here is
     * brute-forcing a numeric OTP, not generic request volume.
     */
    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request, HttpServletRequest httpRequest) {
        enforceRateLimit("reset-password:ip:" + clientIp(httpRequest), 20, Duration.ofMinutes(15));
        enforceRateLimit("reset-password:user:" + request.username(), 5, Duration.ofMinutes(15));
        authService.confirmPasswordReset(request.username(), request.otp(), request.newPassword());
        return ApiResponse.success(null);
    }

    private void enforceRateLimit(String key, int maxAttempts, Duration window) {
        if (!rateLimiter.tryConsume(key, maxAttempts, window)) {
            throw new BusinessException(
                    "TOO_MANY_REQUESTS", "Too many attempts. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    /** Standard X-Forwarded-For-aware client IP lookup - this app isn't behind a proxy in dev,
     * but will be in a real deployment, so the header is checked first regardless. */
    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
