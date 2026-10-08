package com.company.project.modules.crm.dto.request;

import com.company.project.modules.crm.domain.CrmColumnType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * How to read an uploaded file into a dataset. Each mapping sends one column of the file to either an existing column of
 * the dataset ({@code columnId}) or a new one ({@code newName} and {@code newType}); columns of the file that are not
 * mapped are ignored.
 */
public record ImportOptions(
        @NotNull(message = "tableIndex is required")
        Integer tableIndex,

        @NotEmpty(message = "mappings is required")
        @Size(max = 50, message = "at most 50 columns can be mapped")
        List<@Valid ColumnMapping> mappings,

        @NotNull(message = "duplicatePolicy is required")
        DuplicatePolicy duplicatePolicy
) {

    public record ColumnMapping(
            @NotNull(message = "sourceIndex is required")
            Integer sourceIndex,

            Long columnId,

            @Size(max = 100, message = "newName must be at most 100 characters")
            String newName,

            CrmColumnType newType
    ) {
    }
}
