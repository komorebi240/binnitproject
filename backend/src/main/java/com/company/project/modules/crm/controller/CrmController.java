package com.company.project.modules.crm.controller;

import com.company.project.common.ApiResponse;
import com.company.project.common.RateLimitGuard;
import com.company.project.common.exception.BusinessException;
import com.company.project.modules.crm.dto.request.CreateColumnRequest;
import com.company.project.modules.crm.dto.request.CreateDatasetRequest;
import com.company.project.modules.crm.dto.request.ImportOptions;
import com.company.project.modules.crm.dto.request.RenameColumnRequest;
import com.company.project.modules.crm.dto.request.SaveRowRequest;
import com.company.project.modules.crm.dto.request.UpdateDatasetRequest;
import com.company.project.modules.crm.dto.response.AuditLogResponse;
import com.company.project.modules.crm.dto.response.ColumnResponse;
import com.company.project.modules.crm.dto.response.DatasetDetailResponse;
import com.company.project.modules.crm.dto.response.DatasetResponse;
import com.company.project.modules.crm.dto.response.ImportPreviewResponse;
import com.company.project.modules.crm.dto.response.ImportResultResponse;
import com.company.project.modules.crm.dto.response.RowPageResponse;
import com.company.project.modules.crm.dto.response.RowResponse;
import com.company.project.modules.crm.file.CrmTemplateBuilder;
import com.company.project.modules.crm.service.CrmAuditService;
import com.company.project.modules.crm.service.CrmDatasetService;
import com.company.project.modules.crm.service.CrmExportService;
import com.company.project.modules.crm.service.CrmImportService;
import com.company.project.modules.crm.service.CrmRowService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.util.List;

/**
 * The CRM endpoints. Who may do what is decided in the services (CrmAccessPolicy); this class only adapts HTTP and puts a
 * rate limit in front of the actions that move data in or out in bulk.
 */
@RestController
@RequestMapping("/api/v1/crm")
public class CrmController {

    private static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    private static final MediaType DOCX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    private static final int IMPORTS_PER_HOUR = 20;
    private static final int EXPORTS_PER_HOUR = 10;

    private final CrmDatasetService datasetService;
    private final CrmRowService rowService;
    private final CrmImportService importService;
    private final CrmExportService exportService;
    private final CrmAuditService auditService;
    private final CrmTemplateBuilder templateBuilder;
    private final RateLimitGuard rateLimitGuard;

    public CrmController(
            CrmDatasetService datasetService,
            CrmRowService rowService,
            CrmImportService importService,
            CrmExportService exportService,
            CrmAuditService auditService,
            CrmTemplateBuilder templateBuilder,
            RateLimitGuard rateLimitGuard) {
        this.datasetService = datasetService;
        this.rowService = rowService;
        this.importService = importService;
        this.exportService = exportService;
        this.auditService = auditService;
        this.templateBuilder = templateBuilder;
        this.rateLimitGuard = rateLimitGuard;
    }

    // ---- datasets and columns

    @GetMapping("/datasets")
    public ApiResponse<List<DatasetResponse>> listDatasets(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(datasetService.list(caller));
    }

    @GetMapping("/datasets/{id}")
    public ApiResponse<DatasetDetailResponse> getDataset(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(datasetService.get(id, caller));
    }

    @PostMapping("/datasets")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DatasetDetailResponse> createDataset(
            @Valid @RequestBody CreateDatasetRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(datasetService.create(request, caller));
    }

    @PutMapping("/datasets/{id}")
    public ApiResponse<DatasetResponse> updateDataset(
            @PathVariable Long id, @Valid @RequestBody UpdateDatasetRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(datasetService.update(id, request, caller));
    }

    @DeleteMapping("/datasets/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDataset(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        datasetService.delete(id, caller);
    }

    @PostMapping("/datasets/{id}/columns")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ColumnResponse> addColumn(
            @PathVariable Long id, @Valid @RequestBody CreateColumnRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(datasetService.addColumn(id, request, caller));
    }

    @PatchMapping("/columns/{columnId}")
    public ApiResponse<ColumnResponse> renameColumn(
            @PathVariable Long columnId, @Valid @RequestBody RenameColumnRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(datasetService.renameColumn(columnId, request, caller));
    }

    @DeleteMapping("/columns/{columnId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteColumn(@PathVariable Long columnId, @AuthenticationPrincipal UserPrincipal caller) {
        datasetService.deleteColumn(columnId, caller);
    }

    // ---- customers (rows)

    @GetMapping("/datasets/{id}/rows")
    public ApiResponse<RowPageResponse> listRows(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String q,
            @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(rowService.list(id, page, size, q, caller));
    }

    @PostMapping("/datasets/{id}/rows")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RowResponse> addRow(
            @PathVariable Long id, @Valid @RequestBody SaveRowRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(rowService.add(id, request, caller));
    }

    @PatchMapping("/rows/{rowId}")
    public ApiResponse<RowResponse> updateRow(
            @PathVariable Long rowId, @Valid @RequestBody SaveRowRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(rowService.update(rowId, request, caller));
    }

    @DeleteMapping("/rows/{rowId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRow(@PathVariable Long rowId, @AuthenticationPrincipal UserPrincipal caller) {
        rowService.delete(rowId, caller);
    }

    // ---- import, export, templates

    @PostMapping("/imports/preview")
    public ApiResponse<ImportPreviewResponse> previewImport(
            @RequestPart("file") MultipartFile file, @AuthenticationPrincipal UserPrincipal caller) {
        rateLimitGuard.enforce("crm-import:" + caller.getUserId(), IMPORTS_PER_HOUR * 3, Duration.ofHours(1));
        return ApiResponse.success(importService.preview(file.getOriginalFilename(), bytesOf(file), caller));
    }

    @PostMapping("/datasets/{id}/import")
    public ApiResponse<ImportResultResponse> importInto(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file,
            @Valid @RequestPart("options") ImportOptions options,
            @AuthenticationPrincipal UserPrincipal caller) {
        rateLimitGuard.enforce("crm-import-commit:" + caller.getUserId(), IMPORTS_PER_HOUR, Duration.ofHours(1));
        return ApiResponse.success(importService.importInto(id, file.getOriginalFilename(), bytesOf(file), options, caller));
    }

    @GetMapping("/datasets/{id}/export")
    public ResponseEntity<byte[]> export(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        rateLimitGuard.enforce("crm-export:" + caller.getUserId(), EXPORTS_PER_HOUR, Duration.ofHours(1));
        CrmExportService.ExportFile file = exportService.export(id, caller);
        return download(file.fileName(), XLSX, file.content());
    }

    @GetMapping("/templates/xlsx")
    public ResponseEntity<byte[]> excelTemplate() {
        return download("orbit-crm-template.xlsx", XLSX, templateBuilder.excel(LocaleContextHolder.getLocale()));
    }

    @GetMapping("/templates/docx")
    public ResponseEntity<byte[]> wordTemplate() {
        return download("orbit-crm-template.docx", DOCX, templateBuilder.word(LocaleContextHolder.getLocale()));
    }

    // ---- audit

    @GetMapping("/audit")
    public ApiResponse<List<AuditLogResponse>> audit(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(auditService.listRecent(caller));
    }

    private static byte[] bytesOf(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new BusinessException("IMPORT_UNREADABLE", "The file could not be read", HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    private static ResponseEntity<byte[]> download(String fileName, MediaType type, byte[] content) {
        return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(content);
    }
}
