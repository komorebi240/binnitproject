package com.company.project.modules.projects.controller;

import com.company.project.common.ApiResponse;
import com.company.project.common.RateLimitGuard;
import com.company.project.modules.projects.dto.request.AddProjectMemberRequest;
import com.company.project.modules.projects.dto.request.CreateProjectRequest;
import com.company.project.modules.projects.dto.request.InviteDepartmentRequest;
import com.company.project.modules.projects.dto.request.LinkProjectFolderRequest;
import com.company.project.modules.projects.dto.request.SendProjectMessageRequest;
import com.company.project.modules.projects.dto.request.UpdateProjectRequest;
import com.company.project.modules.projects.dto.response.ProjectDetailResponse;
import com.company.project.modules.projects.dto.response.ProjectFolderLinkResponse;
import com.company.project.modules.projects.dto.response.ProjectMessageResponse;
import com.company.project.modules.projects.dto.response.ProjectSummaryResponse;
import com.company.project.modules.projects.service.ProjectService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

/** Role checks live in ProjectServiceImpl (they depend on the project, not just the caller's role). */
@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final RateLimitGuard rateLimitGuard;

    public ProjectController(ProjectService projectService, RateLimitGuard rateLimitGuard) {
        this.projectService = projectService;
        this.rateLimitGuard = rateLimitGuard;
    }

    @GetMapping
    public ApiResponse<List<ProjectSummaryResponse>> list(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(projectService.listProjects(caller));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProjectDetailResponse> create(
            @Valid @RequestBody CreateProjectRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        rateLimitGuard.enforce("project-create:" + caller.getUserId(), 20, Duration.ofHours(1));
        return ApiResponse.success(projectService.createProject(request, caller));
    }

    @GetMapping("/{id}")
    public ApiResponse<ProjectDetailResponse> get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(projectService.getProject(id, caller));
    }

    @PatchMapping("/{id}")
    public ApiResponse<ProjectDetailResponse> update(
            @PathVariable Long id, @Valid @RequestBody UpdateProjectRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(projectService.updateProject(id, request, caller));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        projectService.deleteProject(id, caller);
    }

    @PostMapping("/{id}/departments")
    public ApiResponse<ProjectDetailResponse> invite(
            @PathVariable Long id, @Valid @RequestBody InviteDepartmentRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(projectService.inviteDepartment(id, request, caller));
    }

    @PostMapping("/{id}/departments/{departmentId}/accept")
    public ApiResponse<ProjectDetailResponse> accept(
            @PathVariable Long id, @PathVariable Long departmentId, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(projectService.respondToInvitation(id, departmentId, true, caller));
    }

    @PostMapping("/{id}/departments/{departmentId}/decline")
    public ApiResponse<ProjectDetailResponse> decline(
            @PathVariable Long id, @PathVariable Long departmentId, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(projectService.respondToInvitation(id, departmentId, false, caller));
    }

    @DeleteMapping("/{id}/departments/{departmentId}")
    public ApiResponse<ProjectDetailResponse> removeDepartment(
            @PathVariable Long id, @PathVariable Long departmentId, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(projectService.removeDepartment(id, departmentId, caller));
    }

    @PostMapping("/{id}/members")
    public ApiResponse<ProjectDetailResponse> addMember(
            @PathVariable Long id, @Valid @RequestBody AddProjectMemberRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(projectService.addMember(id, request, caller));
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ApiResponse<ProjectDetailResponse> removeMember(
            @PathVariable Long id, @PathVariable Long userId, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(projectService.removeMember(id, userId, caller));
    }

    @PostMapping("/{id}/folders")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProjectFolderLinkResponse> linkFolder(
            @PathVariable Long id, @Valid @RequestBody LinkProjectFolderRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        rateLimitGuard.enforce("project-folder:" + caller.getUserId(), 30, Duration.ofHours(1));
        return ApiResponse.success(projectService.linkFolder(id, request, caller));
    }

    @DeleteMapping("/{id}/folders/{linkId}")
    public ApiResponse<ProjectDetailResponse> unlinkFolder(
            @PathVariable Long id, @PathVariable Long linkId, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(projectService.unlinkFolder(id, linkId, caller));
    }

    @GetMapping("/{id}/messages")
    public ApiResponse<List<ProjectMessageResponse>> messages(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(projectService.listMessages(id, caller));
    }

    @PostMapping("/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProjectMessageResponse> send(
            @PathVariable Long id, @Valid @RequestBody SendProjectMessageRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        rateLimitGuard.enforce("project-chat:" + caller.getUserId(), 60, Duration.ofMinutes(1));
        return ApiResponse.success(projectService.sendMessage(id, request, caller));
    }
}
