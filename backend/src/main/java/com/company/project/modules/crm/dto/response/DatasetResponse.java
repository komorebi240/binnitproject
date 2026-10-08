package com.company.project.modules.crm.dto.response;

import com.company.project.modules.crm.domain.CrmSourceType;

import java.time.Instant;

/** {@code canManage}: whether the caller may rename, import into, add columns to or delete the dataset (a UI hint; the server checks again). */
public record DatasetResponse(
        Long id,
        String name,
        CrmSourceType sourceType,
        String description,
        Long departmentId,
        String departmentName,
        long rowCount,
        boolean canManage,
        Instant createdAt
) {
}
