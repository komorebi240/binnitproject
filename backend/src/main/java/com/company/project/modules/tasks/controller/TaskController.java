package com.company.project.modules.tasks.controller;

import com.company.project.common.ApiResponse;
import com.company.project.modules.tasks.dto.request.CreateTaskRequest;
import com.company.project.modules.tasks.dto.response.TaskResponse;
import com.company.project.modules.tasks.service.TaskService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Coarse tier check here (must be at least a TEAM_LEAD to create a task at all); who can
 * assign to whom, and who may accept/decline/complete/cancel a given task, is a business rule
 * enforced in TaskServiceImpl — the controller stays thin (CLAUDE.md section 5).
 */
@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyAuthority('EXECUTIVE','DEPARTMENT_HEAD','TEAM_LEAD')")
    public ApiResponse<TaskResponse> create(
            @Valid @RequestBody CreateTaskRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(taskService.createTask(request, caller));
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
}
