package com.company.project.modules.crm.dto.response;

import com.company.project.modules.crm.domain.CrmColumnType;

public record ColumnResponse(Long id, String name, CrmColumnType dataType, int position) {
}
