package com.company.project.modules.projects.dto.response;

import java.util.List;

/**
 * Everything the project page shows. The last five fields tell the screen what THIS caller may do; they only
 * decide which buttons appear - every action is checked again on the server.
 */
public record ProjectDetailResponse(
        Long id,
        String name,
        String description,
        Long ownerDepartmentId,
        String ownerDepartmentName,
        List<ProjectDepartmentResponse> departments,
        List<ProjectMemberResponse> members,
        List<ProjectFolderResponse> folders,
        boolean canManage,
        boolean member,
        boolean canWork,
        /** Departments whose invitation the caller may accept or decline. */
        List<Long> respondableDepartmentIds,
        /** Departments the caller may add people from. */
        List<Long> memberManageableDepartmentIds
) {
}
