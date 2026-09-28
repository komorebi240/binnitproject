package com.company.project.modules.tasks.dto.response;

import com.company.project.common.AssigneeType;
import com.company.project.common.TaskPriority;
import com.company.project.common.TaskStatus;

import java.time.Instant;
import java.time.LocalDate;

public record TaskResponse(
        Long id,
        String title,
        String description,
        AssigneeType assigneeType,
        Long assigneeUserId,
        String assigneeUserName,
        Long assigneeDepartmentId,
        String assigneeDepartmentName,
        Long assignedByUserId,
        String assignedByUserName,
        TaskStatus status,
        TaskPriority priority,
        LocalDate dueDate,
        Instant createdAt,
        Instant decidedAt,
        Instant completedAt
) {
}
