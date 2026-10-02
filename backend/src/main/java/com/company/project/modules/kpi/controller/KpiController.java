package com.company.project.modules.kpi.controller;

import com.company.project.common.ApiResponse;
import com.company.project.modules.kpi.dto.request.ReplaceIncentiveTiersRequest;
import com.company.project.modules.kpi.dto.request.UpdateKpiConfigRequest;
import com.company.project.modules.kpi.dto.response.KpiConfigResponse;
import com.company.project.modules.kpi.dto.response.KpiSummaryResponse;
import com.company.project.modules.kpi.service.KpiService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/kpi")
public class KpiController {

    private final KpiService kpiService;

    public KpiController(KpiService kpiService) {
        this.kpiService = kpiService;
    }

    @GetMapping("/config")
    public ApiResponse<KpiConfigResponse> getConfig(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(kpiService.getConfig(caller));
    }

    @PatchMapping("/config")
    @PreAuthorize("hasAuthority('EXECUTIVE')")
    public ApiResponse<KpiConfigResponse> updateConfig(
            @Valid @RequestBody UpdateKpiConfigRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(kpiService.updateConfig(request, caller));
    }

    @PutMapping("/config/incentive-tiers")
    @PreAuthorize("hasAuthority('EXECUTIVE')")
    public ApiResponse<KpiConfigResponse> replaceIncentiveTiers(
            @Valid @RequestBody ReplaceIncentiveTiersRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(kpiService.replaceIncentiveTiers(request, caller));
    }

    @GetMapping("/me/summary")
    public ApiResponse<KpiSummaryResponse> getMySummary(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(kpiService.getMyKpiSummary(caller));
    }

    @GetMapping("/users/{id}/summary")
    @PreAuthorize("hasAnyAuthority('EXECUTIVE','DEPARTMENT_HEAD','TEAM_LEAD')")
    public ApiResponse<KpiSummaryResponse> getUserSummary(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(kpiService.getUserKpiSummary(id, caller));
    }
}
