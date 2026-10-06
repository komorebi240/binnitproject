package com.company.project.modules.tasks.dto.request;

import com.company.project.common.AssigneeType;
import com.company.project.common.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * No companyId/assignedByUserId - the company is always the caller's own, and the assigner is
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

        LocalDate dueDate,

        @Size(max = 500, message = "driveUrl must be at most 500 characters")
        String driveUrl,

        /** Optional checklist lines created together with the task. */
        @Size(max = 30, message = "a checklist can have at most 30 items")
        List<@NotBlank(message = "checklist items must not be blank") @Size(max = 200, message = "checklist item must be at most 200 characters") String> checklist,

        /** Optional: makes this a task of a cross-department project (the assignee must be one of its members). */
        Long projectId
) {

    /** An ordinary task, outside any project. */
    public CreateTaskRequest(
            String title, String description, AssigneeType assigneeType, Long assigneeUserId, Long assigneeDepartmentId,
            TaskPriority priority, LocalDate dueDate, String driveUrl, List<String> checklist) {
        this(title, description, assigneeType, assigneeUserId, assigneeDepartmentId, priority, dueDate, driveUrl, checklist, null);
    }
}
