package com.company.project.modules.identity.controller;

import com.company.project.common.ApiResponse;
import com.company.project.modules.identity.dto.request.CreateUserRequest;
import com.company.project.modules.identity.dto.response.UserSummaryResponse;
import com.company.project.modules.identity.service.UserManagementService;
import com.company.project.security.UserPrincipal;
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

import java.util.List;

/**
 * Coarse tier check here (must be at least a TEAM_LEAD to touch this endpoint at all); who can
 * grant/remove which specific authority level and where is a business rule enforced in
 * UserManagementService (CLAUDE.md section 5 — controller stays thin).
 */
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserManagementService userManagementService;

    public UserController(UserManagementService userManagementService) {
        this.userManagementService = userManagementService;
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
    public void delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        userManagementService.deleteUser(id, caller);
    }
}
