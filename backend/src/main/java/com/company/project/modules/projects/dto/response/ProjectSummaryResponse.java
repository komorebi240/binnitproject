package com.company.project.modules.projects.dto.response;

public record ProjectSummaryResponse(
        Long id,
        String name,
        String description,
        Long ownerDepartmentId,
        String ownerDepartmentName,
        int memberCount,
        int supportDepartmentCount,
        boolean member,
        /** True when a department the caller can answer for has an open invitation to this project. */
        boolean invitationWaiting
) {
}
