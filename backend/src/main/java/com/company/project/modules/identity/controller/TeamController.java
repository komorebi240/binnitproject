package com.company.project.modules.identity.controller;

import com.company.project.common.ApiResponse;
import com.company.project.modules.identity.dto.request.CreateTeamRequest;
import com.company.project.modules.identity.dto.response.TeamResponse;
import com.company.project.modules.identity.service.OrganizationService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class TeamController {

    private final OrganizationService organizationService;

    public TeamController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @PostMapping("/api/v1/departments/{departmentId}/teams")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyAuthority('EXECUTIVE','DEPARTMENT_HEAD')")
    public ApiResponse<TeamResponse> create(
            @PathVariable Long departmentId,
            @Valid @RequestBody CreateTeamRequest request,
            @AuthenticationPrincipal UserPrincipal caller
    ) {
        return ApiResponse.success(organizationService.createTeam(departmentId, request, caller));
    }

    @GetMapping("/api/v1/departments/{departmentId}/teams")
    public ApiResponse<List<TeamResponse>> list(
            @PathVariable Long departmentId, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(organizationService.listTeams(departmentId, caller));
    }

    @DeleteMapping("/api/v1/teams/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyAuthority('EXECUTIVE','DEPARTMENT_HEAD')")
    public void delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        organizationService.deleteTeam(id, caller);
    }
}
