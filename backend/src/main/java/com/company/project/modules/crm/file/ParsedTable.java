package com.company.project.modules.crm.file;

import java.util.List;

/**
 * A table read from an uploaded file: a sheet of a workbook, a CSV file, or a table of a Word document. {@code headers}
 * is the first row; {@code rows} are the rows after it (every row exactly as wide as the headers; blank rows are dropped).
 */
public record ParsedTable(String name, List<String> headers, List<List<String>> rows) {
}
