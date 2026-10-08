package com.company.project.modules.crm.service;

import com.company.project.modules.crm.domain.CrmAuditAction;
import com.company.project.modules.crm.dto.response.AuditLogResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

public interface CrmAuditService {

    /** Records an action. {@code detail} must hold counts or ids only, never a customer's details. */
    void record(UserPrincipal caller, CrmAuditAction action, Long datasetId, String detail);

    /** The newest entries of the caller's company. Executives only. */
    List<AuditLogResponse> listRecent(UserPrincipal caller);
}
