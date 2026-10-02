package com.company.project.modules.identity.dto.response;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.PresenceStatus;

/**
 * Internal company directory entry (Phase 7 plan) - readable by anyone in the same company, not
 * restricted to managers like UserSummaryResponse's listing is. Deliberately omits anything
 * beyond what a normal internal directory would show (no phone/employeeCode/startDate).
 */
public record DepartmentMemberResponse(
        Long userId,
        String fullName,
        String title,
        String email,
        AuthorityLevel authorityLevel,
        String avatarUrl,
        PresenceStatus presenceStatus
) {
}
