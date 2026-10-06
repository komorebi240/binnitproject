package com.company.project.modules.tasks.dto.response;

import com.company.project.common.AssigneeType;
import com.company.project.common.TaskPriority;
import com.company.project.common.TaskStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

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
        Instant completedAt,
        String driveUrl,
        List<TaskAttachmentResponse> attachments,
        List<ChecklistItemResponse> checklist,
        /** The project this task belongs to, or null. */
        Long projectId,
        /** Whether the caller may add/remove files and change the Drive link (UI hint; the server re-checks). */
        boolean canManage
) {
}
