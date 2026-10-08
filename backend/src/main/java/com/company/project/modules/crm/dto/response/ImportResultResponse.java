package com.company.project.modules.crm.dto.response;

import java.util.List;

/**
 * The outcome of an import. {@code issues} lists up to a few refused cells by position (row number of the file and column
 * name) and the reason - never the cell's value.
 */
public record ImportResultResponse(int created, int updated, int skippedDuplicates, int rejected, List<Issue> issues) {

    public record Issue(int row, String column, String problem) {
    }
}
