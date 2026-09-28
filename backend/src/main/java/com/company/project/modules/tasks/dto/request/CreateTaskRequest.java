package com.company.project.modules.tasks.dto.request;

import com.company.project.common.AssigneeType;
import com.company.project.common.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * No companyId/assignedByUserId — the company is always the caller's own, and the assigner is
 * always the caller (CLAUDE.md section 9/10). Whether the caller is allowed to assign to this
 * specific user/department is a business rule checked in the service layer, not something Bean
 * Validation alone can express (mirrors CreateUserRequest from Phase 1).
 */
public record CreateTaskRequest(
        @NotBlank(message = "title is required")
        @Size(max = 200, message = "title must be at most 200 characters")
        String title,

        String description,

        @NotNull(message = "assigneeType is required")
        AssigneeType assigneeType,

        Long assigneeUserId,

        Long assigneeDepartmentId,

        TaskPriority priority,

        LocalDate dueDate
) {
}
