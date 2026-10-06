package com.company.project.modules.projects.dto.response;

import com.company.project.modules.projects.domain.ProjectDepartmentRole;
import com.company.project.modules.projects.domain.ProjectInviteStatus;

import java.time.Instant;

public record ProjectDepartmentResponse(
        Long departmentId,
        String departmentName,
        ProjectDepartmentRole role,
        ProjectInviteStatus status,
        String note,
        Instant decidedAt,
        int memberCount
) {
}
