package com.company.project.modules.identity.dto.response;

import com.company.project.common.AuthorityLevel;

/** Never includes passwordHash — see CLAUDE.md section 7 (never return passwords through APIs). */
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
        String teamName
) {
}
