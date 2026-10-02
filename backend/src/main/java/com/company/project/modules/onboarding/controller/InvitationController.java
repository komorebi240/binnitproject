package com.company.project.modules.onboarding.controller;

import com.company.project.common.ApiResponse;
import com.company.project.common.RateLimitGuard;
import com.company.project.modules.identity.dto.response.UserProfileResponse;
import com.company.project.modules.identity.service.AuthService;
import com.company.project.modules.identity.service.impl.CustomUserDetailsService;
import com.company.project.modules.onboarding.dto.request.AcceptInvitationRequest;
import com.company.project.modules.onboarding.dto.request.CreateInvitationRequest;
import com.company.project.modules.onboarding.dto.response.InvitationPreviewResponse;
import com.company.project.modules.onboarding.dto.response.InvitationResponse;
import com.company.project.modules.onboarding.service.InvitationService;
import com.company.project.security.AuthCookies;
import com.company.project.security.JwtService;
import com.company.project.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

/**
 * Two audiences share this controller: managers (authenticated, EMPLOYEE excluded) create and
 * manage invitations; the invitee (public, token in the path) previews and accepts one.
 */
@RestController
@RequestMapping("/api/v1")
public class InvitationController {

    private static final String MANAGERS_ONLY = "hasAnyAuthority('EXECUTIVE','DEPARTMENT_HEAD','TEAM_LEAD')";

    private final InvitationService invitationService;
    private final AuthService authService;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final RateLimitGuard rateLimitGuard;

    public InvitationController(
            InvitationService invitationService,
            AuthService authService,
            CustomUserDetailsService userDetailsService,
            JwtService jwtService,
            RateLimitGuard rateLimitGuard) {
        this.invitationService = invitationService;
        this.authService = authService;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.rateLimitGuard = rateLimitGuard;
    }

    @PostMapping("/invitations")
    @PreAuthorize(MANAGERS_ONLY)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<InvitationResponse> create(
            @Valid @RequestBody CreateInvitationRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        rateLimitGuard.enforce("invite:user:" + caller.getUserId(), 30, Duration.ofHours(1));
        return ApiResponse.success(invitationService.create(request, caller));
    }

    @GetMapping("/invitations")
    @PreAuthorize(MANAGERS_ONLY)
    public ApiResponse<List<InvitationResponse>> listPending(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(invitationService.listPending(caller));
    }

    @DeleteMapping("/invitations/{id}")
    @PreAuthorize(MANAGERS_ONLY)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        invitationService.revoke(id, caller);
    }

    @PostMapping("/invitations/{id}/resend")
    @PreAuthorize(MANAGERS_ONLY)
    public ApiResponse<InvitationResponse> resend(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        rateLimitGuard.enforce("invite:user:" + caller.getUserId(), 30, Duration.ofHours(1));
        return ApiResponse.success(invitationService.resend(id, caller));
    }

    @GetMapping("/auth/invitations/{token}")
    public ApiResponse<InvitationPreviewResponse> preview(@PathVariable String token, HttpServletRequest httpRequest) {
        rateLimitGuard.enforce("invite-token:ip:" + RateLimitGuard.clientIp(httpRequest), 30, Duration.ofMinutes(15));
        return ApiResponse.success(invitationService.preview(token));
    }

    /** Creates the account from the invitation and signs the new user in with the normal session cookie. */
    @PostMapping("/auth/invitations/{token}/accept")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserProfileResponse> accept(
            @PathVariable String token,
            @Valid @RequestBody AcceptInvitationRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        rateLimitGuard.enforce("invite-token:ip:" + RateLimitGuard.clientIp(httpRequest), 30, Duration.ofMinutes(15));
        String username = invitationService.accept(token, request);
        UserPrincipal principal = (UserPrincipal) userDetailsService.loadUserByUsername(username);
        AuthCookies.issue(response, jwtService, principal);
        return ApiResponse.success(authService.getProfile(principal));
    }
}
