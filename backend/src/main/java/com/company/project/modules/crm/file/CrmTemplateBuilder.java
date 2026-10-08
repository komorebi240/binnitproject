package com.company.project.modules.crm.file;

import com.company.project.modules.crm.CrmProperties;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Locale;

/**
 * The demonstration files people download before they import: a table with the usual columns and two made-up customers,
 * and the rules for filling it in, in the language of the request. Everything in them is invented; none of it is data.
 */
@Component
public class CrmTemplateBuilder {

    private static final String[] COLUMN_KEYS = {"name", "email", "phone", "company", "note"};
    private static final String[] SAMPLE_KEYS = {"1", "2"};
    private static final String[] GUIDE_KEYS = {"1", "2", "3", "4", "5", "6"};

    private final MessageSource messages;
    private final CrmProperties properties;

    public CrmTemplateBuilder(MessageSource messages, CrmProperties properties) {
        this.messages = messages;
        this.properties = properties;
    }

    public byte[] excel(Locale locale) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Font bold = workbook.createFont();
            bold.setBold(true);
            CellStyle header = workbook.createCellStyle();
            header.setFont(bold);

            Sheet data = workbook.createSheet(text("crm.template.sheet.data", locale));
            Row headerRow = data.createRow(0);
            for (int c = 0; c < COLUMN_KEYS.length; c++) {
                var cell = headerRow.createCell(c);
                cell.setCellValue(text("crm.template.header." + COLUMN_KEYS[c], locale));
                cell.setCellStyle(header);
                data.setColumnWidth(c, 24 * 256);
            }
            for (int r = 0; r < SAMPLE_KEYS.length; r++) {
                Row row = data.createRow(r + 1);
                for (int c = 0; c < COLUMN_KEYS.length; c++) {
                    row.createCell(c).setCellValue(text("crm.template.sample." + SAMPLE_KEYS[r] + "." + COLUMN_KEYS[c], locale));
                }
            }

            Sheet guide = workbook.createSheet(text("crm.template.sheet.guide", locale));
            guide.setColumnWidth(0, 110 * 256);
            Row title = guide.createRow(0);
            title.createCell(0).setCellValue(text("crm.template.title", locale));
            title.getCell(0).setCellStyle(header);
            for (int i = 0; i < GUIDE_KEYS.length; i++) {
                guide.createRow(i + 2).createCell(0).setCellValue(guideLine(GUIDE_KEYS[i], locale));
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Could not build the Excel template", e);
        }
    }

    public byte[] word(Locale locale) {
        try (XWPFDocument document = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XWPFRun title = document.createParagraph().createRun();
            title.setBold(true);
            title.setFontSize(16);
            title.setText(text("crm.template.title", locale));

            for (String key : GUIDE_KEYS) {
                XWPFParagraph paragraph = document.createParagraph();
                paragraph.createRun().setText("- " + guideLine(key, locale));
            }
            document.createParagraph();

            XWPFTable table = document.createTable(1 + SAMPLE_KEYS.length, COLUMN_KEYS.length);
            XWPFTableRow headerRow = table.getRow(0);
            for (int c = 0; c < COLUMN_KEYS.length; c++) {
                XWPFRun run = headerRow.getCell(c).getParagraphs().get(0).createRun();
                run.setBold(true);
                run.setText(text("crm.template.header." + COLUMN_KEYS[c], locale));
            }
            for (int r = 0; r < SAMPLE_KEYS.length; r++) {
                XWPFTableRow row = table.getRow(r + 1);
                for (int c = 0; c < COLUMN_KEYS.length; c++) {
                    row.getCell(c).getParagraphs().get(0).createRun().setText(text("crm.template.sample." + SAMPLE_KEYS[r] + "." + COLUMN_KEYS[c], locale));
                }
            }
            document.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Could not build the Word template", e);
        }
    }

    private String guideLine(String key, Locale locale) {
        // Numbers are passed as text so the message does not print them with thousands separators.
        return messages.getMessage(
                "crm.template.guide." + key,
                new Object[] {String.valueOf(properties.maxImportRows()), String.valueOf(properties.maxImportBytes() / (1024 * 1024))},
                locale);
    }

    private String text(String key, Locale locale) {
        return messages.getMessage(key, null, locale);
    }
}
