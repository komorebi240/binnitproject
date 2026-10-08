package com.company.project.modules.crm.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

/** Values by column id. Adding a row: columns left out are empty. Editing: only the columns present change. */
public record SaveRowRequest(
        @NotNull(message = "values is required")
        Map<Long, String> values
) {
}
