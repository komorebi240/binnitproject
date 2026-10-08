package com.company.project.modules.crm.service.impl;

import com.company.project.common.exception.BusinessException;
import com.company.project.modules.crm.CrmProperties;
import com.company.project.modules.crm.domain.CrmAuditAction;
import com.company.project.modules.crm.domain.CrmColumnEntity;
import com.company.project.modules.crm.domain.CrmDatasetEntity;
import com.company.project.modules.crm.domain.CrmRowEntity;
import com.company.project.modules.crm.repository.CrmColumnRepository;
import com.company.project.modules.crm.repository.CrmRowRepository;
import com.company.project.modules.crm.service.CrmAccessPolicy;
import com.company.project.modules.crm.service.CrmAuditService;
import com.company.project.modules.crm.service.CrmExportService;
import com.company.project.modules.crm.service.CrmRowCodec;
import com.company.project.security.UserPrincipal;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class CrmExportServiceImpl implements CrmExportService {

    private static final int WINDOW = 200;
    private static final int MAX_SHEET_NAME = 31;

    private final CrmColumnRepository columnRepository;
    private final CrmRowRepository rowRepository;
    private final CrmAccessPolicy accessPolicy;
    private final CrmAuditService auditService;
    private final CrmRowCodec codec;
    private final CrmProperties properties;

    public CrmExportServiceImpl(
            CrmColumnRepository columnRepository,
            CrmRowRepository rowRepository,
            CrmAccessPolicy accessPolicy,
            CrmAuditService auditService,
            CrmRowCodec codec,
            CrmProperties properties) {
        this.columnRepository = columnRepository;
        this.rowRepository = rowRepository;
        this.accessPolicy = accessPolicy;
        this.auditService = auditService;
        this.codec = codec;
        this.properties = properties;
    }

    @Override
    @PreAuthorize("hasAuthority('EXECUTIVE')")
    @Transactional
    public ExportFile export(Long datasetId, UserPrincipal caller) {
        CrmDatasetEntity dataset = accessPolicy.requireManageable(datasetId, caller);
        if (rowRepository.countByDatasetId(datasetId) > properties.exportMaxRows()) {
            throw new BusinessException("EXPORT_TOO_LARGE", "A dataset of more than " + properties.exportMaxRows() + " customers cannot be exported in one file", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        List<CrmColumnEntity> columns = columnRepository.findAllActiveByDatasetId(datasetId);
        List<CrmRowEntity> rows = rowRepository.findAllByDatasetId(datasetId);

        byte[] content;
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(WINDOW); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName(dataset.getName()));
            Font bold = workbook.createFont();
            bold.setBold(true);
            CellStyle header = workbook.createCellStyle();
            header.setFont(bold);

            Row headerRow = sheet.createRow(0);
            for (int c = 0; c < columns.size(); c++) {
                var cell = headerRow.createCell(c);
                cell.setCellValue(columns.get(c).getName());
                cell.setCellStyle(header);
            }
            int rowNumber = 1;
            for (CrmRowEntity row : rows) {
                Map<Long, String> values = codec.decode(row.getCompanyId(), row.getData());
                Row sheetRow = sheet.createRow(rowNumber++);
                for (int c = 0; c < columns.size(); c++) {
                    // Always a text cell: a value that starts with "=" is shown as text, never run as a formula.
                    sheetRow.createCell(c).setCellValue(values.getOrDefault(columns.get(c).getId(), ""));
                }
            }
            workbook.write(out);
            workbook.dispose();
            content = out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Could not write the export file", e);
        }

        auditService.record(caller, CrmAuditAction.EXPORT, datasetId, "rows=" + rows.size() + " columns=" + columns.size());
        return new ExportFile(fileName(dataset.getName()), content);
    }

    /** Excel sheet names are at most 31 characters and may not contain \ / ? * [ ] : */
    private static String sheetName(String name) {
        String cleaned = name.replaceAll("[\\\\/?*\\[\\]:]", " ").strip();
        if (cleaned.isEmpty()) {
            cleaned = "CRM";
        }
        return cleaned.length() > MAX_SHEET_NAME ? cleaned.substring(0, MAX_SHEET_NAME) : cleaned;
    }

    /** A file name that is safe on every system: letters, digits, dash and underscore only. */
    private static String fileName(String datasetName) {
        String ascii = java.text.Normalizer.normalize(datasetName, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('đ', 'd').replace('Đ', 'D')
                .replaceAll("[^A-Za-z0-9]+", "-").replaceAll("^-+|-+$", "");
        return (ascii.isEmpty() ? "crm" : ascii) + "-" + LocalDate.now() + ".xlsx";
    }
}
