package com.company.project.modules.identity.dto.response;

import com.company.project.common.AuthorityLevel;

public record UserSummaryResponse(
        Long id,
        String username,
        String fullName,
        AuthorityLevel authorityLevel,
        String title,
        Long departmentId,
        Long teamId
) {
}
