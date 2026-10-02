package com.company.project.modules.kpi.service;

import com.company.project.modules.kpi.dto.request.ReplaceIncentiveTiersRequest;
import com.company.project.modules.kpi.dto.request.UpdateKpiConfigRequest;
import com.company.project.modules.kpi.dto.response.KpiConfigResponse;
import com.company.project.modules.kpi.dto.response.KpiSummaryResponse;
import com.company.project.security.UserPrincipal;

public interface KpiService {

    /** Readable by anyone in the company - transparency of the formula (Phase 5 plan). */
    KpiConfigResponse getConfig(UserPrincipal caller);

    /** EXECUTIVE only. */
    KpiConfigResponse updateConfig(UpdateKpiConfigRequest request, UserPrincipal caller);

    /** EXECUTIVE only - replaces the whole incentive-tier list. */
    KpiConfigResponse replaceIncentiveTiers(ReplaceIncentiveTiersRequest request, UserPrincipal caller);

    KpiSummaryResponse getMyKpiSummary(UserPrincipal caller);

    /** Same scope rules as UserManagementServiceImpl: EXECUTIVE/company, DEPARTMENT_HEAD/own department, TEAM_LEAD/own team. */
    KpiSummaryResponse getUserKpiSummary(Long userId, UserPrincipal caller);
}
