package com.company.project.modules.projects.dto.response;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.PresenceStatus;

public record ProjectMemberResponse(
        Long userId,
        String fullName,
        String title,
        String email,
        Long departmentId,
        String departmentName,
        AuthorityLevel authorityLevel,
        String avatarUrl,
        PresenceStatus presenceStatus
) {
}
