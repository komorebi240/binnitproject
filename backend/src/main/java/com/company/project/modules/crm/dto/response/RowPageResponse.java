package com.company.project.modules.crm.dto.response;

import java.util.List;

public record RowPageResponse(List<RowResponse> rows, int page, int size, long total) {
}
