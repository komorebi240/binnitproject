package com.company.project.modules.identity.dto.response;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.PresenceStatus;

import java.time.LocalDate;

public record UserSummaryResponse(
        Long id,
        String username,
        String fullName,
        AuthorityLevel authorityLevel,
        String title,
        Long departmentId,
        Long teamId,
        boolean active,
        String phone,
        String employeeCode,
        LocalDate startDate,
        String avatarUrl,
        PresenceStatus presenceStatus
) {
}
