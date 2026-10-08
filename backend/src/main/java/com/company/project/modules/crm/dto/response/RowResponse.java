package com.company.project.modules.crm.dto.response;

import java.util.Map;

/** A customer: values by column id (columns with no value are absent). {@code canDelete}: a UI hint (the server checks again). */
public record RowResponse(Long id, Map<Long, String> values, boolean canDelete) {
}
