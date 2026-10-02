package com.company.project.modules.identity.service;

import com.company.project.common.PresenceStatus;
import com.company.project.modules.identity.dto.request.UpdateProfileRequest;
import com.company.project.modules.identity.dto.response.UserProfileResponse;
import com.company.project.security.UserPrincipal;
import org.springframework.web.multipart.MultipartFile;

public interface AuthService {

    /** Throws org.springframework.security.core.AuthenticationException on any failure. */
    UserPrincipal authenticate(String username, String password);

    UserProfileResponse getProfile(UserPrincipal principal);

    /** Throws BusinessException(401-equivalent business code) if currentPassword is wrong. */
    void changePassword(UserPrincipal caller, String currentPassword, String newPassword);

    UserProfileResponse updateProfile(UserPrincipal caller, UpdateProfileRequest request);

    /**
     * Always succeeds from the caller's point of view - never reveals whether the username
     * exists (CLAUDE.md section 13, user enumeration). Throws BusinessException if the email
     * feature itself is unavailable (SMTP not configured), which is symmetric for every
     * username and therefore does not leak anything either.
     */
    void requestPasswordReset(String username);

    void confirmPasswordReset(String username, String otp, String newPassword);

    /** Replaces the caller's own avatar - deletes the previous file, if any (AvatarStorageService). */
    UserProfileResponse uploadAvatar(UserPrincipal caller, MultipartFile file);

    UserProfileResponse updatePresence(UserPrincipal caller, PresenceStatus status);

    /** Marks the first-run guided tour as finished (or skipped) for the caller. */
    UserProfileResponse completeOnboarding(UserPrincipal caller);
}
