package com.company.project.modules.projects.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * {@code ownerDepartmentId} is required for an executive; a department head always owns the project for
 * their own department. {@code supportDepartmentIds} are invited right away (each head decides separately).
 */
public record CreateProjectRequest(
        @NotBlank(message = "name is required")
        @Size(max = 200, message = "name must be at most 200 characters")
        String name,

        @Size(max = 1000, message = "description must be at most 1000 characters")
        String description,

        Long ownerDepartmentId,

        List<Long> supportDepartmentIds,

        @Size(max = 500, message = "inviteNote must be at most 500 characters")
        String inviteNote
) {
}
