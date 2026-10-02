package com.company.project.modules.drive.controller;

import com.company.project.common.ApiResponse;
import com.company.project.modules.drive.dto.request.CreateFolderAccessRequest;
import com.company.project.modules.drive.dto.response.FolderAccessRequestResponse;
import com.company.project.modules.drive.service.FolderAccessRequestService;
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
 * EXECUTIVE is excluded from creating requests - they already have full rights, requesting
 * cross-department access doesn't fit their scope (Phase 3 plan simplification). Approve/reject
 * scope (owning department head or executive) is enforced in FolderAccessRequestServiceImpl,
 * not here.
 */
@RestController
@RequestMapping("/api/v1/drive/access-requests")
public class FolderAccessRequestController {

    private final FolderAccessRequestService folderAccessRequestService;

    public FolderAccessRequestController(FolderAccessRequestService folderAccessRequestService) {
        this.folderAccessRequestService = folderAccessRequestService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyAuthority('DEPARTMENT_HEAD','TEAM_LEAD','EMPLOYEE')")
    public ApiResponse<FolderAccessRequestResponse> create(
            @Valid @RequestBody CreateFolderAccessRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(folderAccessRequestService.createRequest(request, caller));
    }

    @GetMapping
    public ApiResponse<List<FolderAccessRequestResponse>> list(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(folderAccessRequestService.listRequests(caller));
    }

    @PostMapping("/{id}/approve")
    public ApiResponse<FolderAccessRequestResponse> approve(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(folderAccessRequestService.approveRequest(id, caller));
    }

    @PostMapping("/{id}/reject")
    public ApiResponse<FolderAccessRequestResponse> reject(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(folderAccessRequestService.rejectRequest(id, caller));
    }
}
