package com.company.project.modules.identity.controller;

import com.company.project.common.ApiResponse;
import com.company.project.common.RateLimitGuard;
import com.company.project.modules.identity.dto.request.CreateUserRequest;
import com.company.project.modules.identity.dto.request.DeleteUserRequest;
import com.company.project.modules.identity.dto.request.SetActiveRequest;
import com.company.project.modules.identity.dto.request.UpdatePositionRequest;
import com.company.project.modules.identity.dto.response.UserSummaryResponse;
import com.company.project.modules.identity.service.AvatarStorageService;
import com.company.project.modules.identity.service.UserManagementService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

/**
 * Coarse tier check here (must be at least a TEAM_LEAD to touch this endpoint at all); who can
 * grant/remove which specific authority level and where is a business rule enforced in
 * UserManagementService (CLAUDE.md section 5 - controller stays thin).
 */
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserManagementService userManagementService;
    private final RateLimitGuard rateLimitGuard;

    public UserController(UserManagementService userManagementService, RateLimitGuard rateLimitGuard) {
        this.userManagementService = userManagementService;
        this.rateLimitGuard = rateLimitGuard;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyAuthority('EXECUTIVE','DEPARTMENT_HEAD','TEAM_LEAD')")
    public ApiResponse<UserSummaryResponse> create(
            @Valid @RequestBody CreateUserRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(userManagementService.createUser(request, caller));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('EXECUTIVE','DEPARTMENT_HEAD','TEAM_LEAD')")
    public ApiResponse<List<UserSummaryResponse>> list(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(userManagementService.listUsers(caller));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyAuthority('EXECUTIVE','DEPARTMENT_HEAD','TEAM_LEAD')")
    public void delete(
            @PathVariable Long id,
            @Valid @RequestBody DeleteUserRequest request,
            @AuthenticationPrincipal UserPrincipal caller) {
        // Without this a stolen session could be used to guess the password through this endpoint.
        rateLimitGuard.enforce("delete-user:" + caller.getUserId(), 5, Duration.ofMinutes(15));
        userManagementService.deleteUser(id, request.password(), caller);
    }

    @PatchMapping("/{id}/position")
    @PreAuthorize("hasAnyAuthority('EXECUTIVE','DEPARTMENT_HEAD','TEAM_LEAD')")
    public ApiResponse<UserSummaryResponse> updatePosition(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePositionRequest request,
            @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(userManagementService.updatePosition(id, request, caller));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('EXECUTIVE','DEPARTMENT_HEAD','TEAM_LEAD')")
    public ApiResponse<UserSummaryResponse> setActive(
            @PathVariable Long id,
            @Valid @RequestBody SetActiveRequest request,
            @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(userManagementService.setActive(id, request.active(), caller));
    }

    /** No @PreAuthorize tier gate - any authenticated company member can see another member's
     * avatar wherever one is shown (directory, messages), same visibility rule as
     * DepartmentController.listMembers. Tenant isolation is still enforced in the service. */
    @GetMapping("/{id}/avatar")
    public ResponseEntity<InputStreamResource> getAvatar(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        AvatarStorageService.Resolved avatar = userManagementService.getAvatarFile(id, caller);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(avatar.contentType()))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .contentLength(avatar.sizeBytes())
                .body(new InputStreamResource(avatar.data()));
    }
}
