package com.company.project.modules.crm.file;

import com.company.project.common.exception.BusinessException;
import com.company.project.modules.crm.CrmProperties;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Reads the tables of an uploaded file: Excel (.xlsx), CSV and Word (.docx - tables only; text outside a table is not
 * data). Everything uploaded is untrusted: the size and the number of rows and columns are limited, workbooks are opened
 * with the library's zip-bomb limits tightened, formulas are never evaluated (the value Excel last stored is read) and
 * nothing is written to disk.
 */
@Component
public class CrmFileReader {

    private static final int MAX_SHEETS = 20;
    private static final String[] DELIMITERS = {",", ";", "\t"};

    static {
        // A spreadsheet is a zip of XML: refuse the ones that would unpack into something far bigger than they claim.
        ZipSecureFile.setMinInflateRatio(0.01);
        ZipSecureFile.setMaxEntrySize(60L * 1024 * 1024);
        ZipSecureFile.setMaxTextSize(30L * 1024 * 1024);
    }

    private final CrmProperties properties;

    public CrmFileReader(CrmProperties properties) {
        this.properties = properties;
    }

    /** The tables of the file, in order; at least one. */
    public List<ParsedTable> read(String fileName, byte[] content) {
        if (content.length == 0 || content.length > properties.maxImportBytes()) {
            throw new BusinessException("IMPORT_FILE_TOO_LARGE", "The file is empty or larger than the allowed size", HttpStatus.PAYLOAD_TOO_LARGE);
        }
        String extension = extensionOf(fileName);
        List<ParsedTable> tables;
        try {
            tables = switch (extension) {
                case "xlsx" -> {
                    requireZip(content);
                    yield readWorkbook(content);
                }
                case "docx" -> {
                    requireZip(content);
                    yield readWord(content);
                }
                case "csv", "tsv", "txt" -> readCsv(content);
                default -> throw new BusinessException(
                        "IMPORT_UNSUPPORTED_FILE", "Only .xlsx, .docx and .csv files can be imported", HttpStatus.UNSUPPORTED_MEDIA_TYPE);
            };
        } catch (BusinessException e) {
            throw e;
        } catch (IOException | RuntimeException e) {
            // Not a usable workbook/document (corrupt, wrong type, a zip bomb...). The reason is not for the client.
            throw new BusinessException("IMPORT_UNREADABLE", "The file could not be read", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (tables.isEmpty()) {
            throw new BusinessException("IMPORT_NO_TABLE", "The file has no table with data", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        return tables;
    }

    private List<ParsedTable> readWorkbook(byte[] content) throws IOException {
        List<ParsedTable> tables = new ArrayList<>();
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            for (int index = 0; index < Math.min(workbook.getNumberOfSheets(), MAX_SHEETS); index++) {
                if (workbook.isSheetHidden(index) || workbook.isSheetVeryHidden(index)) {
                    continue;
                }
                Sheet sheet = workbook.getSheetAt(index);
                List<List<String>> rows = new ArrayList<>();
                for (Row row : sheet) {
                    requireWithinRows(rows.size());
                    List<String> cells = new ArrayList<>();
                    for (int column = 0; column < row.getLastCellNum(); column++) {
                        cells.add(cellText(row.getCell(column)));
                    }
                    rows.add(cells);
                }
                addTable(tables, sheet.getSheetName(), rows);
            }
        }
        return tables;
    }

    private List<ParsedTable> readWord(byte[] content) throws IOException {
        List<ParsedTable> tables = new ArrayList<>();
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(content))) {
            int number = 1;
            for (XWPFTable table : document.getTables()) {
                List<List<String>> rows = new ArrayList<>();
                for (XWPFTableRow row : table.getRows()) {
                    requireWithinRows(rows.size());
                    List<String> cells = new ArrayList<>();
                    for (XWPFTableCell cell : row.getTableCells()) {
                        cells.add(cell.getText().strip());
                    }
                    rows.add(cells);
                }
                addTable(tables, "Table " + number++, rows);
            }
        }
        return tables;
    }

    private List<ParsedTable> readCsv(byte[] content) {
        String text = new String(content, StandardCharsets.UTF_8);
        if (text.startsWith("﻿")) {
            text = text.substring(1);
        }
        String delimiter = detectDelimiter(text);
        List<List<String>> rows = parseCsv(text, delimiter.charAt(0));
        List<ParsedTable> tables = new ArrayList<>();
        addTable(tables, "CSV", rows);
        return tables;
    }

    /** The delimiter that splits the first line into the most fields (outside quotes); a comma when none does. */
    private static String detectDelimiter(String text) {
        int end = text.indexOf('\n');
        String firstLine = end < 0 ? text : text.substring(0, end);
        String best = DELIMITERS[0];
        int bestCount = 0;
        for (String delimiter : DELIMITERS) {
            int count = parseCsv(firstLine, delimiter.charAt(0)).stream().mapToInt(List::size).max().orElse(0);
            if (count > bestCount) {
                best = delimiter;
                bestCount = count;
            }
        }
        return best;
    }

    /** RFC 4180: fields may be quoted, a doubled quote inside quotes is a quote, quoted fields may contain delimiters and line breaks. */
    private static List<List<String>> parseCsv(String text, char delimiter) {
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (quoted) {
                if (c == '"') {
                    if (i + 1 < text.length() && text.charAt(i + 1) == '"') {
                        field.append('"');
                        i++;
                    } else {
                        quoted = false;
                    }
                } else {
                    field.append(c);
                }
            } else if (c == '"' && field.length() == 0) {
                quoted = true;
            } else if (c == delimiter) {
                row.add(field.toString().strip());
                field.setLength(0);
            } else if (c == '\n' || c == '\r') {
                if (c == '\r' && i + 1 < text.length() && text.charAt(i + 1) == '\n') {
                    i++;
                }
                row.add(field.toString().strip());
                field.setLength(0);
                rows.add(row);
                row = new ArrayList<>();
            } else {
                field.append(c);
            }
        }
        if (field.length() > 0 || !row.isEmpty()) {
            row.add(field.toString().strip());
            rows.add(row);
        }
        return rows;
    }

    /** Header = first non-blank row; rows are cut or padded to the header's width; blank rows are dropped. */
    private void addTable(List<ParsedTable> tables, String name, List<List<String>> rawRows) {
        List<List<String>> rows = rawRows.stream().filter(row -> row.stream().anyMatch(cell -> !cell.isBlank())).toList();
        if (rows.isEmpty()) {
            return;
        }
        List<String> headerRow = rows.get(0);
        int width = headerRow.size();
        while (width > 0 && headerRow.get(width - 1).isBlank()) {
            width--;
        }
        if (width == 0) {
            return;
        }
        if (width > properties.maxColumns()) {
            throw new BusinessException("IMPORT_TOO_WIDE", "The table has more than " + properties.maxColumns() + " columns", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        List<String> headers = headerRow.subList(0, width).stream().map(String::strip).toList();
        List<List<String>> body = new ArrayList<>();
        for (List<String> row : rows.subList(1, rows.size())) {
            List<String> cells = new ArrayList<>(width);
            for (int i = 0; i < width; i++) {
                cells.add(i < row.size() ? row.get(i) : "");
            }
            body.add(cells);
        }
        requireWithinRows(body.size());
        tables.add(new ParsedTable(name, headers, body));
    }

    private void requireWithinRows(int rowsSoFar) {
        if (rowsSoFar > properties.maxImportRows()) {
            throw new BusinessException("IMPORT_TOO_LARGE", "The table has more than " + properties.maxImportRows() + " rows", HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    private static String cellText(Cell cell) {
        if (cell == null) {
            return "";
        }
        CellType type = cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
        return switch (type) {
            case STRING -> cell.getStringCellValue().strip();
            case NUMERIC -> DateUtil.isCellDateFormatted(cell) ? date(cell) : plain(cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }

    private static String date(Cell cell) {
        LocalDate date = cell.getLocalDateTimeCellValue().toLocalDate();
        return date.toString();
    }

    /** The number as stored (no thousands separators or currency from the cell's display format), without a trailing ".0". */
    private static String plain(double value) {
        return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
    }

    private static String extensionOf(String fileName) {
        if (fileName == null) {
            return "";
        }
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? "" : fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    /** An .xlsx or .docx is a zip: check the signature instead of trusting the name. */
    private static void requireZip(byte[] content) {
        boolean zip = content.length > 4 && content[0] == 'P' && content[1] == 'K' && content[2] == 3 && content[3] == 4;
        if (!zip) {
            throw new BusinessException("IMPORT_UNREADABLE", "The file could not be read", HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }
}
