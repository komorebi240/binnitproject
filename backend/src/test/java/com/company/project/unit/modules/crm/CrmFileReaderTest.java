package com.company.project.unit.modules.crm;

import com.company.project.common.exception.BusinessException;
import com.company.project.modules.crm.CrmProperties;
import com.company.project.modules.crm.file.CrmFileReader;
import com.company.project.modules.crm.file.ParsedTable;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static com.company.project.unit.modules.crm.CrmTestSupport.PROPERTIES;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CrmFileReaderTest {

    private final CrmFileReader reader = new CrmFileReader(PROPERTIES);

    private static byte[] workbook(java.util.function.Consumer<XSSFWorkbook> fill) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            fill.accept(workbook);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private static void row(Sheet sheet, int index, String... cells) {
        Row row = sheet.createRow(index);
        for (int c = 0; c < cells.length; c++) {
            row.createCell(c).setCellValue(cells[c]);
        }
    }

    @Test
    void anExcelSheetBecomesATableWithItsFirstRowAsHeaders() throws Exception {
        byte[] file = workbook(book -> {
            Sheet sheet = book.createSheet("Leads");
            row(sheet, 0, "Name", "Email", "Phone");
            row(sheet, 1, "An", "an@example.com", "0912345678");
            row(sheet, 3, "Binh", "binh@example.com", "");
        });

        List<ParsedTable> tables = reader.read("leads.xlsx", file);

        assertThat(tables).hasSize(1);
        assertThat(tables.get(0).name()).isEqualTo("Leads");
        assertThat(tables.get(0).headers()).containsExactly("Name", "Email", "Phone");
        assertThat(tables.get(0).rows()).containsExactly(List.of("An", "an@example.com", "0912345678"), List.of("Binh", "binh@example.com", ""));
    }

    @Test
    void numbersAndDatesAreReadAsTheirValueNotTheirDisplayFormat() throws Exception {
        byte[] file = workbook(book -> {
            Sheet sheet = book.createSheet("S");
            row(sheet, 0, "Amount", "When");
            Row data = sheet.createRow(1);
            data.createCell(0).setCellValue(1234567.5);
            var when = data.createCell(1);
            when.setCellValue(java.sql.Date.valueOf(LocalDate.of(2026, 10, 8)));
            var style = book.createCellStyle();
            style.setDataFormat(book.getCreationHelper().createDataFormat().getFormat("dd/mm/yyyy"));
            when.setCellStyle(style);
        });

        assertThat(reader.read("n.xlsx", file).get(0).rows().get(0)).containsExactly("1234567.5", "2026-10-08");
    }

    @Test
    void aFormulaIsNeverEvaluatedItsLastStoredValueIsRead() throws Exception {
        byte[] file = workbook(book -> {
            Sheet sheet = book.createSheet("S");
            row(sheet, 0, "A", "B");
            Row data = sheet.createRow(1);
            data.createCell(0).setCellValue("x");
            data.createCell(1).setCellFormula("1+1");
        });

        // POI writes no cached result for a formula it did not evaluate, so the cell reads as empty - not as "2" and not as "=1+1".
        assertThat(reader.read("f.xlsx", file).get(0).rows().get(0).get(1)).doesNotContain("=").isNotEqualTo("2");
    }

    @Test
    void hiddenAndEmptySheetsAreSkippedAndAWorkbookCanHaveSeveralTables() throws Exception {
        byte[] file = workbook(book -> {
            row(book.createSheet("One"), 0, "A");
            book.getSheet("One").createRow(1).createCell(0).setCellValue("1");
            book.createSheet("Empty");
            Sheet hidden = book.createSheet("Hidden");
            row(hidden, 0, "H");
            hidden.createRow(1).createCell(0).setCellValue("secret");
            book.setSheetHidden(2, true);
            Sheet two = book.createSheet("Two");
            row(two, 0, "B");
            two.createRow(1).createCell(0).setCellValue("2");
        });

        List<ParsedTable> tables = reader.read("many.xlsx", file);

        assertThat(tables).extracting(ParsedTable::name).containsExactly("One", "Two");
    }

    @Test
    void tablesOfAWordFileAreReadAndTextOutsideThemIsNot() throws Exception {
        byte[] file;
        try (XWPFDocument document = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            document.createParagraph().createRun().setText("Some text that is not data");
            XWPFTable table = document.createTable(2, 2);
            table.getRow(0).getCell(0).setText("Name");
            table.getRow(0).getCell(1).setText("Email");
            table.getRow(1).getCell(0).setText("An");
            table.getRow(1).getCell(1).setText("an@example.com");
            document.write(out);
            file = out.toByteArray();
        }

        List<ParsedTable> tables = reader.read("list.docx", file);

        assertThat(tables).hasSize(1);
        assertThat(tables.get(0).headers()).containsExactly("Name", "Email");
        assertThat(tables.get(0).rows()).containsExactly(List.of("An", "an@example.com"));
    }

    @Test
    void aWordFileWithoutATableHasNothingToImport() throws Exception {
        byte[] file;
        try (XWPFDocument document = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            document.createParagraph().createRun().setText("Only text");
            document.write(out);
            file = out.toByteArray();
        }

        assertThatThrownBy(() -> reader.read("text.docx", file)).isInstanceOf(BusinessException.class).hasMessageContaining("no table");
    }

    @Test
    void csvHandlesQuotesBomAndTheCommonDelimiters() {
        String comma = "﻿Name,Note\r\n\"An, Nguyen\",\"said \"\"hi\"\"\"\r\nBinh,\"two\nlines\"\r\n";
        String semicolon = "Name;Email\nAn;an@example.com\n";

        ParsedTable first = reader.read("a.csv", comma.getBytes(StandardCharsets.UTF_8)).get(0);
        ParsedTable second = reader.read("b.csv", semicolon.getBytes(StandardCharsets.UTF_8)).get(0);

        assertThat(first.headers()).containsExactly("Name", "Note");
        assertThat(first.rows()).containsExactly(List.of("An, Nguyen", "said \"hi\""), List.of("Binh", "two\nlines"));
        assertThat(second.headers()).containsExactly("Name", "Email");
        assertThat(second.rows()).containsExactly(List.of("An", "an@example.com"));
    }

    @Test
    void shortRowsArePaddedLongOnesCutAndBlankRowsDropped() {
        ParsedTable table = reader.read("a.csv", "A,B\n1\n\n1,2,3\n".getBytes(StandardCharsets.UTF_8)).get(0);

        assertThat(table.rows()).containsExactly(List.of("1", ""), List.of("1", "2"));
    }

    @Test
    void unsupportedFilesAreRefused() {
        assertThatThrownBy(() -> reader.read("a.pdf", new byte[] {1, 2, 3, 4, 5})).isInstanceOf(BusinessException.class).hasMessageContaining("Only");
        assertThatThrownBy(() -> reader.read("noextension", new byte[] {1, 2, 3, 4, 5})).isInstanceOf(BusinessException.class);
    }

    @Test
    void aFileThatIsNotWhatItsNameSaysIsUnreadable() {
        assertThatThrownBy(() -> reader.read("fake.xlsx", "this is plain text, not a zip".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("could not be read");
        assertThatThrownBy(() -> reader.read("fake.docx", "PK\u0003\u0004 but nothing real".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("could not be read");
    }

    @Test
    void anEmptyOrOversizedFileIsRefused() {
        assertThatThrownBy(() -> reader.read("a.csv", new byte[0])).isInstanceOf(BusinessException.class);
        CrmProperties small = new CrmProperties(PROPERTIES.dataKey(), 100, 10, 1000, 6, 500);
        assertThatThrownBy(() -> new CrmFileReader(small).read("a.csv", "A,B\n1,2\n3,4\n".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("larger");
    }

    @Test
    void tooManyRowsAndTooManyColumnsAreRefused() {
        StringBuilder rows = new StringBuilder("A\n");
        for (int i = 0; i < 101; i++) {
            rows.append(i).append('\n');
        }
        assertThatThrownBy(() -> reader.read("a.csv", rows.toString().getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("rows");

        assertThatThrownBy(() -> reader.read("a.csv", "1,2,3,4,5,6,7\n1,2,3,4,5,6,7\n".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("columns");
    }
}
