package com.company.project.modules.identity.dto.response;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.PresenceStatus;

/** Never includes passwordHash - see CLAUDE.md section 7 (never return passwords through APIs).
 * {@code avatarUrl} is null when no avatar is set, otherwise a same-origin API path the frontend
 * can use directly as an {@code <img src>} - never a raw filesystem path (see AvatarStorageService). */
public record UserProfileResponse(
        Long userId,
        String username,
        String fullName,
        String email,
        Long companyId,
        String companyName,
        AuthorityLevel authorityLevel,
        String title,
        Long departmentId,
        String departmentName,
        Long teamId,
        String teamName,
        String avatarUrl,
        PresenceStatus presenceStatus,
        boolean systemAccount,
        boolean onboardingCompleted
) {
}
