package com.company.project.modules.crm.dto.response;

import com.company.project.modules.crm.domain.CrmAuditAction;

import java.time.Instant;

public record AuditLogResponse(Long id, String userName, CrmAuditAction action, Long datasetId, String detail, Instant createdAt) {
}
