package com.company.project.modules.crm.dto.response;

import java.util.List;

/** What the uploaded file holds, so the person can choose a table and match its columns before anything is saved. */
public record ImportPreviewResponse(List<PreviewTable> tables) {

    /** A sheet, or a table of a Word file. {@code headers} is its first row; {@code sampleRows} its first few rows after that. */
    public record PreviewTable(int index, String name, List<String> headers, List<List<String>> sampleRows, int totalRows) {
    }
}
