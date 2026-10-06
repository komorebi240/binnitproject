package com.company.project.modules.identity.controller;

import com.company.project.common.ApiResponse;
import com.company.project.modules.identity.dto.request.CreateDepartmentRequest;
import com.company.project.modules.identity.dto.request.UpdateDepartmentRequest;
import com.company.project.modules.identity.dto.response.DepartmentMemberResponse;
import com.company.project.modules.identity.dto.response.DepartmentResponse;
import com.company.project.modules.identity.service.OrganizationService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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

import java.util.List;

/**
 * @PreAuthorize here only checks the caller's authority tier - whether the target department
 * actually belongs to their company is re-checked in OrganizationService, never trusted from
 * the URL (CLAUDE.md section 9).
 */
@RestController
@RequestMapping("/api/v1/departments")
public class DepartmentController {

    private final OrganizationService organizationService;

    public DepartmentController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('EXECUTIVE')")
    public ApiResponse<DepartmentResponse> create(
            @Valid @RequestBody CreateDepartmentRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(organizationService.createDepartment(request, caller));
    }

    /** Executive, or the head of that department (the service re-checks which department). */
    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('EXECUTIVE', 'DEPARTMENT_HEAD')")
    public ApiResponse<DepartmentResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDepartmentRequest request,
            @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(organizationService.updateDepartment(id, request, caller));
    }

    @GetMapping
    public ApiResponse<List<DepartmentResponse>> list(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(organizationService.listDepartments(caller));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('EXECUTIVE')")
    public void delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        organizationService.deleteDepartment(id, caller);
    }

    /** Internal company directory - any authenticated user, not just managers (Phase 7 plan). */
    @GetMapping("/{id}/members")
    public ApiResponse<List<DepartmentMemberResponse>> listMembers(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(organizationService.listDepartmentMembers(id, caller));
    }
}
