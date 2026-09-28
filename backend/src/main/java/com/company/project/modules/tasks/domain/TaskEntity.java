package com.company.project.modules.tasks.domain;

import com.company.project.common.AssigneeType;
import com.company.project.common.TaskPriority;
import com.company.project.common.TaskStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;

/**
 * A task assigned to either one user or an entire department (a shared queue — see the
 * Phase 2 plan). Status transitions are guarded here as a last-resort check
 * (IllegalArgumentException); the service layer is expected to pre-validate and raise a
 * proper 422 BusinessException first — mirrors the pattern already used by PositionEntity's
 * isScopeValid.
 */
@Entity
@Table(name = "tasks")
@EntityListeners(AuditingEntityListener.class)
public class TaskEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignee_type", nullable = false, length = 20)
    private AssigneeType assigneeType;

    @Column(name = "assignee_user_id")
    private Long assigneeUserId;

    @Column(name = "assignee_department_id")
    private Long assigneeDepartmentId;

    @Column(name = "assigned_by_user_id", nullable = false)
    private Long assignedByUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskStatus status = TaskStatus.ASSIGNED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TaskPriority priority;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @LastModifiedBy
    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted = false;

    protected TaskEntity() {
        // JPA
    }

    public TaskEntity(
            Long companyId,
            String title,
            String description,
            AssigneeType assigneeType,
            Long assigneeUserId,
            Long assigneeDepartmentId,
            Long assignedByUserId,
            TaskPriority priority,
            LocalDate dueDate
    ) {
        if (!isAssigneeValid(assigneeType, assigneeUserId, assigneeDepartmentId)) {
            throw new IllegalArgumentException(
                    "assigneeUserId/assigneeDepartmentId do not match assigneeType " + assigneeType);
        }
        this.companyId = companyId;
        this.title = title;
        this.description = description;
        this.assigneeType = assigneeType;
        this.assigneeUserId = assigneeUserId;
        this.assigneeDepartmentId = assigneeDepartmentId;
        this.assignedByUserId = assignedByUserId;
        this.priority = priority;
        this.dueDate = dueDate;
    }

    /** Mirrors the DB check constraint ck_tasks_assignee_matches_type (V5 migration). */
    public static boolean isAssigneeValid(AssigneeType type, Long userId, Long departmentId) {
        return switch (type) {
            case USER -> userId != null && departmentId == null;
            case DEPARTMENT -> departmentId != null && userId == null;
        };
    }

    public void accept() {
        requireStatus(TaskStatus.ASSIGNED, "accept");
        this.status = TaskStatus.ACCEPTED;
        this.decidedAt = Instant.now();
    }

    public void decline() {
        requireStatus(TaskStatus.ASSIGNED, "decline");
        this.status = TaskStatus.DECLINED;
        this.decidedAt = Instant.now();
    }

    public void complete() {
        requireStatus(TaskStatus.ACCEPTED, "complete");
        this.status = TaskStatus.DONE;
        this.completedAt = Instant.now();
    }

    public void cancel() {
        if (status == TaskStatus.DONE || status == TaskStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot cancel a task that is already " + status);
        }
        this.status = TaskStatus.CANCELLED;
    }

    private void requireStatus(TaskStatus required, String action) {
        if (status != required) {
            throw new IllegalArgumentException(
                    "Cannot " + action + " a task in status " + status + " (expected " + required + ")");
        }
    }

    public Long getId() {
        return id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public AssigneeType getAssigneeType() {
        return assigneeType;
    }

    public Long getAssigneeUserId() {
        return assigneeUserId;
    }

    public Long getAssigneeDepartmentId() {
        return assigneeDepartmentId;
    }

    public Long getAssignedByUserId() {
        return assignedByUserId;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public TaskPriority getPriority() {
        return priority;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public boolean isDeleted() {
        return deleted;
    }
}
