package com.company.project.modules.onboarding.controller;

import com.company.project.common.ApiResponse;
import com.company.project.common.RateLimitGuard;
import com.company.project.modules.identity.dto.response.UserProfileResponse;
import com.company.project.modules.identity.service.AuthService;
import com.company.project.modules.identity.service.impl.CustomUserDetailsService;
import com.company.project.modules.onboarding.dto.request.RegisterCompanyRequest;
import com.company.project.modules.onboarding.dto.request.RequestRegistrationOtpRequest;
import com.company.project.modules.onboarding.dto.request.VerifyRegistrationOtpRequest;
import com.company.project.modules.onboarding.dto.response.VerificationTokenResponse;
import com.company.project.modules.onboarding.service.RegistrationService;
import com.company.project.security.SessionCookies;
import com.company.project.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Locale;

/**
 * Public self-service registration (see SecurityConfig). Every endpoint is rate-limited by client IP,
 * and the email-bound ones also per address, so neither a single source nor a single inbox can be abused.
 */
@RestController
@RequestMapping("/api/v1/auth/register")
public class RegistrationController {

    private final RegistrationService registrationService;
    private final AuthService authService;
    private final CustomUserDetailsService userDetailsService;
    private final SessionCookies sessionCookies;
    private final RateLimitGuard rateLimitGuard;

    public RegistrationController(
            RegistrationService registrationService,
            AuthService authService,
            CustomUserDetailsService userDetailsService,
            SessionCookies sessionCookies,
            RateLimitGuard rateLimitGuard) {
        this.registrationService = registrationService;
        this.authService = authService;
        this.userDetailsService = userDetailsService;
        this.sessionCookies = sessionCookies;
        this.rateLimitGuard = rateLimitGuard;
    }

    @PostMapping("/request-otp")
    public ApiResponse<Void> requestOtp(@Valid @RequestBody RequestRegistrationOtpRequest request, HttpServletRequest httpRequest) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        rateLimitGuard.enforce("register-otp:ip:" + RateLimitGuard.clientIp(httpRequest), 10, Duration.ofHours(1));
        rateLimitGuard.enforce("register-otp:email:" + email, 3, Duration.ofHours(1));
        registrationService.requestOtp(request.email());
        return ApiResponse.success(null);
    }

    @PostMapping("/verify-otp")
    public ApiResponse<VerificationTokenResponse> verifyOtp(
            @Valid @RequestBody VerifyRegistrationOtpRequest request, HttpServletRequest httpRequest) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        rateLimitGuard.enforce("register-verify:ip:" + RateLimitGuard.clientIp(httpRequest), 30, Duration.ofMinutes(15));
        rateLimitGuard.enforce("register-verify:email:" + email, 10, Duration.ofMinutes(15));
        return ApiResponse.success(new VerificationTokenResponse(registrationService.verifyOtp(request.email(), request.otp())));
    }

    /** Creates the company and its administrator, then signs them in with the normal session cookie. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserProfileResponse> register(
            @Valid @RequestBody RegisterCompanyRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        rateLimitGuard.enforce("register:ip:" + RateLimitGuard.clientIp(httpRequest), 10, Duration.ofHours(1));
        String username = registrationService.register(request);
        UserPrincipal principal = (UserPrincipal) userDetailsService.loadUserByUsername(username);
        sessionCookies.signIn(response, principal);
        return ApiResponse.success(authService.getProfile(principal));
    }
}
