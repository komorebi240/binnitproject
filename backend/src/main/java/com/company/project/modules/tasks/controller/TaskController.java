package com.company.project.modules.tasks.controller;

import com.company.project.common.ApiResponse;
import com.company.project.common.RateLimiter;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.storage.AttachmentDownloads;
import com.company.project.modules.tasks.dto.request.AddChecklistItemRequest;
import com.company.project.modules.tasks.dto.request.CreateTaskRequest;
import com.company.project.modules.tasks.dto.request.SetChecklistItemDoneRequest;
import com.company.project.modules.tasks.dto.request.UpdateDriveUrlRequest;
import com.company.project.modules.tasks.dto.response.TaskResponse;
import com.company.project.modules.tasks.service.TaskService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.List;

/**
 * No tier restriction on create - anyone can create a task for themselves (Phase 7 plan); who
 * can assign to someone ELSE, and who may accept/decline/complete/cancel a given task, is a
 * business rule enforced in TaskServiceImpl - the controller stays thin (CLAUDE.md section 5).
 */
@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    private static final int MAX_UPLOADS_PER_MINUTE = 20;

    private final TaskService taskService;
    private final RateLimiter rateLimiter;

    public TaskController(TaskService taskService, RateLimiter rateLimiter) {
        this.taskService = taskService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TaskResponse> create(
            @Valid @RequestBody CreateTaskRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.createTask(request, caller));
    }

    @GetMapping("/project/{projectId}")
    public ApiResponse<List<TaskResponse>> listProjectTasks(
            @PathVariable Long projectId, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.listProjectTasks(projectId, caller));
    }

    @GetMapping
    public ApiResponse<List<TaskResponse>> list(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.listTasks(caller));
    }

    @PostMapping("/{id}/accept")
    public ApiResponse<TaskResponse> accept(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.acceptTask(id, caller));
    }

    @PostMapping("/{id}/decline")
    public ApiResponse<TaskResponse> decline(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.declineTask(id, caller));
    }

    @PostMapping("/{id}/complete")
    public ApiResponse<TaskResponse> complete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.completeTask(id, caller));
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<TaskResponse> cancel(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.cancelTask(id, caller));
    }

    @PostMapping("/{id}/restore")
    public ApiResponse<TaskResponse> restore(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.restoreTask(id, caller));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        taskService.deleteTask(id, caller);
    }

    /** Multipart: one {@code file}. Allowed for whoever can manage the task (see TaskServiceImpl). */
    @PostMapping(value = "/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TaskResponse> addAttachment(
            @PathVariable Long id, @RequestParam MultipartFile file, @AuthenticationPrincipal UserPrincipal caller) {
        if (!rateLimiter.tryConsume("task-upload:" + caller.getUserId(), MAX_UPLOADS_PER_MINUTE, Duration.ofMinutes(1))) {
            throw new BusinessException(
                    "TOO_MANY_REQUESTS", "Too many uploads. Please try again shortly.", HttpStatus.TOO_MANY_REQUESTS);
        }
        return ApiResponse.success(taskService.addAttachment(id, file, caller));
    }

    @GetMapping("/{id}/attachments/{attachmentId}")
    public ResponseEntity<InputStreamResource> downloadAttachment(
            @PathVariable Long id, @PathVariable Long attachmentId, @AuthenticationPrincipal UserPrincipal caller) {
        TaskService.AttachmentDownload file = taskService.loadAttachment(id, attachmentId, caller);
        return AttachmentDownloads.respond(file.data(), file.sizeBytes(), file.fileName(), file.contentType(), file.image());
    }

    @DeleteMapping("/{id}/attachments/{attachmentId}")
    public ApiResponse<TaskResponse> removeAttachment(
            @PathVariable Long id, @PathVariable Long attachmentId, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.removeAttachment(id, attachmentId, caller));
    }

    @PostMapping("/{id}/checklist")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TaskResponse> addChecklistItem(
            @PathVariable Long id,
            @Valid @RequestBody AddChecklistItemRequest request,
            @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.addChecklistItem(id, request.text(), caller));
    }

    @PatchMapping("/{id}/checklist/{itemId}")
    public ApiResponse<TaskResponse> setChecklistItemDone(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @Valid @RequestBody SetChecklistItemDoneRequest request,
            @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.setChecklistItemDone(id, itemId, request.done(), caller));
    }

    @DeleteMapping("/{id}/checklist/{itemId}")
    public ApiResponse<TaskResponse> removeChecklistItem(
            @PathVariable Long id, @PathVariable Long itemId, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.removeChecklistItem(id, itemId, caller));
    }

    @PatchMapping("/{id}/drive-url")
    public ApiResponse<TaskResponse> updateDriveUrl(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDriveUrlRequest request,
            @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.updateDriveUrl(id, request.driveUrl(), caller));
    }
}
