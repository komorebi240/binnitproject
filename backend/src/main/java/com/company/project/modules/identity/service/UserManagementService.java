package com.company.project.modules.identity.service;

import com.company.project.common.AuthorityLevel;
import com.company.project.modules.identity.dto.request.CreateUserRequest;
import com.company.project.modules.identity.dto.request.UpdatePositionRequest;
import com.company.project.modules.identity.dto.response.UserSummaryResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

public interface UserManagementService {

    UserSummaryResponse createUser(CreateUserRequest request, UserPrincipal caller);

    List<UserSummaryResponse> listUsers(UserPrincipal caller);

    /** Re-authenticates the caller with their own {@code password} first (422 INVALID_PASSWORD), then applies the usual rules. */
    void deleteUser(Long userId, String password, UserPrincipal caller);

    /** Promotion/transfer: closes the current position and opens a new one (Phase 4 plan). */
    UserSummaryResponse updatePosition(Long userId, UpdatePositionRequest request, UserPrincipal caller);

    /** Suspend (active=false) or restore (active=true) login ability without deleting the account. */
    UserSummaryResponse setActive(Long userId, boolean active, UserPrincipal caller);

    /**
     * Emails the staff member a password-reset code (the same flow as "forgot password") so they choose
     * their own new password; the manager never sees one. Same authority as managing that user.
     */
    void sendPasswordReset(Long userId, UserPrincipal caller);

    /** Sends a code to {@code newEmail}; the email only changes once {@link #confirmEmailChange} gets that code. */
    void requestEmailChange(Long userId, String newEmail, UserPrincipal caller);

    UserSummaryResponse confirmEmailChange(Long userId, String otp, UserPrincipal caller);

    /**
     * Whether the caller may grant {@code level} at this department/team (the same rule as creating
     * a user), and the department/team resolved for it. Throws 403/404/422 exactly like createUser.
     */
    GrantScope validateGrantScope(UserPrincipal caller, AuthorityLevel level, Long departmentId, Long teamId);

    record GrantScope(Long departmentId, Long teamId) {
    }

    /** Tenant-scoped like every other lookup here - a cross-company id 404s (CLAUDE.md section 9/10). */
    AvatarStorageService.Resolved getAvatarFile(Long userId, UserPrincipal caller);
}
