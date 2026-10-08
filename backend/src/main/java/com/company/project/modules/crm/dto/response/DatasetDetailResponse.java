package com.company.project.modules.crm.dto.response;

import java.util.List;

public record DatasetDetailResponse(DatasetResponse dataset, List<ColumnResponse> columns) {
}
