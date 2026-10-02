package com.company.project.modules.tasks.service.impl;

import com.company.project.common.AssigneeType;
import com.company.project.common.AuthorityLevel;
import com.company.project.common.TaskPriority;
import com.company.project.common.TaskStatus;
import com.company.project.common.TransactionHooks;
import com.company.project.common.storage.AttachmentStorage;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.tasks.domain.TaskAttachmentEntity;
import com.company.project.modules.tasks.domain.TaskEntity;
import com.company.project.modules.tasks.dto.request.CreateTaskRequest;
import com.company.project.modules.tasks.dto.response.TaskAttachmentResponse;
import com.company.project.modules.tasks.dto.response.TaskResponse;
import com.company.project.modules.tasks.repository.TaskAttachmentRepository;
import com.company.project.modules.tasks.repository.TaskRepository;
import com.company.project.modules.tasks.service.DriveUrlPolicy;
import com.company.project.modules.tasks.service.TaskService;
import com.company.project.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Who can assign to whom mirrors UserManagementServiceImpl's hierarchy rules (Phase 2 plan):
 * EXECUTIVE anywhere in their company, DEPARTMENT_HEAD only within their own department,
 * TEAM_LEAD only to users in their own team. The same check also gates cancelling someone
 * else's task, since "could assign here" and "has authority over this scope" are the same
 * question. Every check re-derives scope from the caller's UserPrincipal, never from an id the
 * client sent for that purpose (CLAUDE.md section 9/10).
 */
@Service
public class TaskServiceImpl implements TaskService {

    private static final int MAX_ATTACHMENTS_PER_TASK = 10;

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final TaskAttachmentRepository attachmentRepository;
    private final AttachmentStorage attachmentStorage;

    public TaskServiceImpl(
            TaskRepository taskRepository,
            UserRepository userRepository,
            DepartmentRepository departmentRepository,
            PositionRepository positionRepository,
            TaskAttachmentRepository attachmentRepository,
            @Qualifier("taskAttachmentStorage") AttachmentStorage attachmentStorage
    ) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.positionRepository = positionRepository;
        this.attachmentRepository = attachmentRepository;
        this.attachmentStorage = attachmentStorage;
    }

    @Override
    @Transactional
    public TaskResponse createTask(CreateTaskRequest request, UserPrincipal caller) {
        Long assigneeUserId = null;
        Long assigneeDepartmentId = null;

        if (request.assigneeType() == AssigneeType.USER) {
            if (request.assigneeUserId() == null) {
                throw new BusinessException("ASSIGNEE_REQUIRED", "assigneeUserId is required for a USER task", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            UserEntity targetUser = userRepository.findActiveById(request.assigneeUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", request.assigneeUserId()));
            if (!targetUser.getCompanyId().equals(caller.getCompanyId())) {
                throw new ResourceNotFoundException("User", request.assigneeUserId());
            }
            assigneeUserId = targetUser.getId();
        } else {
            if (request.assigneeDepartmentId() == null) {
                throw new BusinessException("ASSIGNEE_REQUIRED", "assigneeDepartmentId is required for a DEPARTMENT task", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            DepartmentEntity department = departmentRepository.findActiveById(request.assigneeDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department", request.assigneeDepartmentId()));
            if (!department.getCompanyId().equals(caller.getCompanyId())) {
                throw new ResourceNotFoundException("Department", request.assigneeDepartmentId());
            }
            assigneeDepartmentId = department.getId();
        }

        // Self-assignment is always allowed, regardless of authority tier - anyone can put a
        // task on their own board, that's not "managing" anyone (Phase 7 plan). Only assigning
        // to someone else still goes through the hierarchy check below.
        boolean isSelfAssignment = request.assigneeType() == AssigneeType.USER
                && assigneeUserId.equals(caller.getUserId());
        if (!isSelfAssignment) {
            assertCallerCanActOnAssignment(caller, request.assigneeType(), assigneeUserId, assigneeDepartmentId);
        }

        String driveUrl = DriveUrlPolicy.normalizeOrReject(request.driveUrl());
        TaskPriority priority = request.priority() != null ? request.priority() : TaskPriority.MEDIUM;
        TaskEntity newTask = new TaskEntity(
                caller.getCompanyId(), request.title(), request.description(), request.assigneeType(),
                assigneeUserId, assigneeDepartmentId, caller.getUserId(), priority, request.dueDate());
        newTask.changeDriveUrl(driveUrl);
        TaskEntity saved = taskRepository.save(newTask);

        return toResponses(List.of(saved), caller).get(0);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskResponse> listTasks(UserPrincipal caller) {
        List<TaskEntity> tasks = switch (caller.getAuthorityLevel()) {
            case EXECUTIVE -> taskRepository.findAllActiveByCompanyId(caller.getCompanyId());
            case DEPARTMENT_HEAD -> {
                List<Long> memberIds = positionRepository.findAllActiveByDepartmentId(caller.getDepartmentId())
                        .stream().map(PositionEntity::getUserId).toList();
                yield taskRepository.findAllActiveForDepartmentScope(caller.getDepartmentId(), memberIds, caller.getUserId());
            }
            case TEAM_LEAD -> {
                List<Long> memberIds = positionRepository.findAllActiveByTeamId(caller.getTeamId())
                        .stream().map(PositionEntity::getUserId).toList();
                yield taskRepository.findAllActiveForTeamScope(memberIds, caller.getUserId());
            }
            case EMPLOYEE -> taskRepository.findAllActiveForEmployee(caller.getUserId(), caller.getDepartmentId());
        };

        return toResponses(tasks, caller);
    }

    @Override
    @Transactional
    public TaskResponse acceptTask(Long taskId, UserPrincipal caller) {
        TaskEntity task = requireOwnCompanyTask(taskId, caller);
        assertCallerCanActOnTask(task, caller);
        requireStatus(task, TaskStatus.ASSIGNED, "accept");
        task.accept();
        return toResponses(List.of(task), caller).get(0);
    }

    @Override
    @Transactional
    public TaskResponse declineTask(Long taskId, UserPrincipal caller) {
        TaskEntity task = requireOwnCompanyTask(taskId, caller);
        assertCallerCanActOnTask(task, caller);
        requireStatus(task, TaskStatus.ASSIGNED, "decline");
        task.decline();
        return toResponses(List.of(task), caller).get(0);
    }

    @Override
    @Transactional
    public TaskResponse completeTask(Long taskId, UserPrincipal caller) {
        TaskEntity task = requireOwnCompanyTask(taskId, caller);
        assertCallerCanActOnTask(task, caller);
        requireStatus(task, TaskStatus.ACCEPTED, "complete");
        task.complete();
        return toResponses(List.of(task), caller).get(0);
    }

    @Override
    @Transactional
    public TaskResponse cancelTask(Long taskId, UserPrincipal caller) {
        TaskEntity task = requireOwnCompanyTask(taskId, caller);
        boolean isAssigner = task.getAssignedByUserId().equals(caller.getUserId());
        if (!isAssigner) {
            assertCallerCanActOnAssignment(caller, task.getAssigneeType(), task.getAssigneeUserId(), task.getAssigneeDepartmentId());
        }
        if (task.getStatus() == TaskStatus.DONE || task.getStatus() == TaskStatus.CANCELLED) {
            throw new BusinessException("INVALID_TASK_STATUS", "Task is already " + task.getStatus(), HttpStatus.UNPROCESSABLE_ENTITY);
        }
        task.cancel();
        return toResponses(List.of(task), caller).get(0);
    }

    @Override
    @Transactional
    public TaskResponse restoreTask(Long taskId, UserPrincipal caller) {
        TaskEntity task = requireOwnCompanyTask(taskId, caller);
        assertCallerCanActOnCancelledTask(task, caller);
        requireStatus(task, TaskStatus.CANCELLED, "restore");
        task.restore();
        return toResponses(List.of(task), caller).get(0);
    }

    @Override
    @Transactional
    public void deleteTask(Long taskId, UserPrincipal caller) {
        TaskEntity task = requireOwnCompanyTask(taskId, caller);
        assertCallerCanActOnCancelledTask(task, caller);
        requireStatus(task, TaskStatus.CANCELLED, "delete");
        task.markDeleted();
    }

    @Override
    @Transactional
    public TaskResponse addAttachment(Long taskId, MultipartFile file, UserPrincipal caller) {
        TaskEntity task = requireVisibleTask(taskId, caller);
        requireCanManage(task, caller);
        if (task.getStatus() == TaskStatus.CANCELLED) {
            throw new BusinessException("INVALID_TASK_STATUS", "Cannot attach files to a cancelled task", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (attachmentRepository.countByTaskId(taskId) >= MAX_ATTACHMENTS_PER_TASK) {
            throw new BusinessException(
                    "TOO_MANY_ATTACHMENTS",
                    "A task can have at most " + MAX_ATTACHMENTS_PER_TASK + " attachments",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        AttachmentStorage.Stored stored = attachmentStorage.store(file);
        try {
            attachmentRepository.save(new TaskAttachmentEntity(
                    taskId, stored.storedName(), stored.displayName(), stored.contentType(),
                    stored.sizeBytes(), stored.image(), caller.getUserId()));
        } catch (RuntimeException e) {
            // Don't leave an unreferenced file on disk when the DB write failed.
            attachmentStorage.delete(stored.storedName());
            throw e;
        }
        return toResponses(List.of(task), caller).get(0);
    }

    @Override
    @Transactional
    public TaskResponse removeAttachment(Long taskId, Long attachmentId, UserPrincipal caller) {
        TaskEntity task = requireVisibleTask(taskId, caller);
        TaskAttachmentEntity attachment = requireAttachmentOf(task, attachmentId);
        boolean isUploader = attachment.getUploadedByUserId().equals(caller.getUserId());
        if (!isUploader) {
            requireCanManage(task, caller);
        }

        attachmentRepository.delete(attachment);
        String storedName = attachment.getStoredName();
        // Only once the DB change is durable: a rolled-back removal must keep its file.
        TransactionHooks.afterCommit(() -> attachmentStorage.delete(storedName));
        return toResponses(List.of(task), caller).get(0);
    }

    @Override
    @Transactional(readOnly = true)
    public AttachmentDownload loadAttachment(Long taskId, Long attachmentId, UserPrincipal caller) {
        TaskEntity task = requireVisibleTask(taskId, caller);
        TaskAttachmentEntity attachment = requireAttachmentOf(task, attachmentId);
        AttachmentStorage.Resolved file = attachmentStorage.load(attachment.getStoredName());
        return new AttachmentDownload(
                file.data(), file.sizeBytes(), attachment.getOriginalName(), attachment.getContentType(), attachment.isImage());
    }

    @Override
    @Transactional
    public TaskResponse updateDriveUrl(Long taskId, String driveUrl, UserPrincipal caller) {
        TaskEntity task = requireVisibleTask(taskId, caller);
        requireCanManage(task, caller);
        task.changeDriveUrl(DriveUrlPolicy.normalizeOrReject(driveUrl));
        return toResponses(List.of(task), caller).get(0);
    }

    private TaskAttachmentEntity requireAttachmentOf(TaskEntity task, Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .filter(a -> a.getTaskId().equals(task.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", attachmentId));
    }

    /**
     * Pure function of the task and the caller (no DB), so it can also be computed per task in the
     * list response. The assigner, the (user) assignee, an executive, or the head of the department
     * a department-wide task was assigned to.
     */
    private boolean canManage(TaskEntity task, UserPrincipal caller) {
        if (task.getAssignedByUserId().equals(caller.getUserId())) {
            return true;
        }
        if (task.getAssigneeType() == AssigneeType.USER && task.getAssigneeUserId().equals(caller.getUserId())) {
            return true;
        }
        if (caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE) {
            return true;
        }
        return caller.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD
                && task.getAssigneeType() == AssigneeType.DEPARTMENT
                && task.getAssigneeDepartmentId().equals(caller.getDepartmentId());
    }

    private void requireCanManage(TaskEntity task, UserPrincipal caller) {
        if (!canManage(task, caller)) {
            throw new AccessDeniedException("You cannot change this task's attachments or Drive link");
        }
    }

    /** Same visibility as listTasks (CLAUDE.md section 9): anything outside it reads as 404. */
    private TaskEntity requireVisibleTask(Long taskId, UserPrincipal caller) {
        TaskEntity task = requireOwnCompanyTask(taskId, caller);
        if (!canView(task, caller)) {
            throw new ResourceNotFoundException("Task", taskId);
        }
        return task;
    }

    private boolean canView(TaskEntity task, UserPrincipal caller) {
        Long callerId = caller.getUserId();
        if (task.getAssignedByUserId().equals(callerId) || callerId.equals(task.getAssigneeUserId())) {
            return true;
        }
        return switch (caller.getAuthorityLevel()) {
            case EXECUTIVE -> true;
            case DEPARTMENT_HEAD -> caller.getDepartmentId().equals(task.getAssigneeDepartmentId())
                    || assigneeUserPosition(task).map(p -> caller.getDepartmentId().equals(p.getDepartmentId())).orElse(false);
            case TEAM_LEAD -> assigneeUserPosition(task).map(p -> caller.getTeamId().equals(p.getTeamId())).orElse(false);
            case EMPLOYEE -> caller.getDepartmentId() != null && caller.getDepartmentId().equals(task.getAssigneeDepartmentId());
        };
    }

    private java.util.Optional<PositionEntity> assigneeUserPosition(TaskEntity task) {
        return task.getAssigneeUserId() == null
                ? java.util.Optional.empty()
                : positionRepository.findActiveByUserId(task.getAssigneeUserId());
    }

    /** Same authority as who could cancel the task in the first place: the original assigner, or
     * whoever could have assigned to this same target (CLAUDE.md section 9/10). */
    private void assertCallerCanActOnCancelledTask(TaskEntity task, UserPrincipal caller) {
        boolean isAssigner = task.getAssignedByUserId().equals(caller.getUserId());
        if (!isAssigner) {
            assertCallerCanActOnAssignment(caller, task.getAssigneeType(), task.getAssigneeUserId(), task.getAssigneeDepartmentId());
        }
    }

    /** Same question as "could this caller assign a task here" - reused for cancel authority too. */
    private void assertCallerCanActOnAssignment(
            UserPrincipal caller, AssigneeType type, Long assigneeUserId, Long assigneeDepartmentId) {
        switch (caller.getAuthorityLevel()) {
            case EXECUTIVE -> {
                // Any target within their own company (already verified by the caller).
            }
            case DEPARTMENT_HEAD -> {
                if (type == AssigneeType.DEPARTMENT) {
                    if (!assigneeDepartmentId.equals(caller.getDepartmentId())) {
                        throw new AccessDeniedException("You can only assign to your own department");
                    }
                } else {
                    // Fetch the whole position, then compare fields directly - Optional.map()
                    // on a field getter collapses to empty when that field is null (e.g. an
                    // EMPLOYEE with no team), which would wrongly turn "wrong scope" (403)
                    // into "user not found" (404). Found by actually running TC-14, not by
                    // reading the code.
                    PositionEntity targetPosition = positionRepository.findActiveByUserId(assigneeUserId)
                            .orElseThrow(() -> new ResourceNotFoundException("User", assigneeUserId));
                    if (!caller.getDepartmentId().equals(targetPosition.getDepartmentId())) {
                        throw new AccessDeniedException("You can only assign to members of your own department");
                    }
                }
            }
            case TEAM_LEAD -> {
                if (type == AssigneeType.DEPARTMENT) {
                    throw new AccessDeniedException("Team leads cannot assign a task to a whole department");
                }
                PositionEntity targetPosition = positionRepository.findActiveByUserId(assigneeUserId)
                        .orElseThrow(() -> new ResourceNotFoundException("User", assigneeUserId));
                if (!caller.getTeamId().equals(targetPosition.getTeamId())) {
                    throw new AccessDeniedException("You can only assign to members of your own team");
                }
            }
            case EMPLOYEE -> throw new AccessDeniedException("Employees cannot assign tasks");
        }
    }

    /** Who may accept/decline/complete: the exact assignee (USER), or a manager of the assignee department (DEPARTMENT). */
    private void assertCallerCanActOnTask(TaskEntity task, UserPrincipal caller) {
        if (task.getAssigneeType() == AssigneeType.USER) {
            if (!task.getAssigneeUserId().equals(caller.getUserId())) {
                throw new AccessDeniedException("You are not the assignee of this task");
            }
            return;
        }
        boolean allowed = caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE
                || (caller.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD
                        && task.getAssigneeDepartmentId().equals(caller.getDepartmentId()));
        if (!allowed) {
            throw new AccessDeniedException("Only that department's head or an executive can act on this task");
        }
    }

    private void requireStatus(TaskEntity task, TaskStatus required, String action) {
        if (task.getStatus() != required) {
            throw new BusinessException(
                    "INVALID_TASK_STATUS",
                    "Cannot " + action + " a task in status " + task.getStatus(),
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    private TaskEntity requireOwnCompanyTask(Long taskId, UserPrincipal caller) {
        TaskEntity task = taskRepository.findActiveById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        if (!task.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("Task", taskId);
        }
        return task;
    }

    private List<TaskResponse> toResponses(List<TaskEntity> tasks, UserPrincipal caller) {
        Set<Long> userIds = new HashSet<>();
        Set<Long> departmentIds = new HashSet<>();
        for (TaskEntity task : tasks) {
            userIds.add(task.getAssignedByUserId());
            if (task.getAssigneeUserId() != null) {
                userIds.add(task.getAssigneeUserId());
            }
            if (task.getAssigneeDepartmentId() != null) {
                departmentIds.add(task.getAssigneeDepartmentId());
            }
        }

        Map<Long, List<TaskAttachmentResponse>> attachmentsByTask = new HashMap<>();
        if (!tasks.isEmpty()) {
            attachmentRepository.findAllByTaskIdIn(tasks.stream().map(TaskEntity::getId).toList()).forEach(a ->
                    attachmentsByTask.computeIfAbsent(a.getTaskId(), k -> new java.util.ArrayList<>()).add(
                            new TaskAttachmentResponse(
                                    a.getId(), a.getOriginalName(), a.getContentType(), a.getSizeBytes(), a.isImage(),
                                    a.getUploadedByUserId())));
        }

        Map<Long, String> userNames = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(UserEntity::getId, UserEntity::getFullName));
        Map<Long, String> departmentNames = departmentRepository.findAllById(departmentIds).stream()
                .collect(Collectors.toMap(DepartmentEntity::getId, DepartmentEntity::getName));

        return tasks.stream()
                .map(task -> new TaskResponse(
                        task.getId(),
                        task.getTitle(),
                        task.getDescription(),
                        task.getAssigneeType(),
                        task.getAssigneeUserId(),
                        task.getAssigneeUserId() != null ? userNames.get(task.getAssigneeUserId()) : null,
                        task.getAssigneeDepartmentId(),
                        task.getAssigneeDepartmentId() != null ? departmentNames.get(task.getAssigneeDepartmentId()) : null,
                        task.getAssignedByUserId(),
                        userNames.get(task.getAssignedByUserId()),
                        task.getStatus(),
                        task.getPriority(),
                        task.getDueDate(),
                        task.getCreatedAt(),
                        task.getDecidedAt(),
                        task.getCompletedAt(),
                        task.getDriveUrl(),
                        attachmentsByTask.getOrDefault(task.getId(), List.of()),
                        canManage(task, caller)))
                .toList();
    }
}
