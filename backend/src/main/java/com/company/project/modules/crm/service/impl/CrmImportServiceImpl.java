package com.company.project.modules.crm.service.impl;

import com.company.project.common.exception.BusinessException;
import com.company.project.modules.crm.CrmProperties;
import com.company.project.modules.crm.domain.CrmAuditAction;
import com.company.project.modules.crm.domain.CrmColumnEntity;
import com.company.project.modules.crm.domain.CrmDatasetEntity;
import com.company.project.modules.crm.domain.CrmRowEntity;
import com.company.project.modules.crm.dto.request.DuplicatePolicy;
import com.company.project.modules.crm.dto.request.ImportOptions;
import com.company.project.modules.crm.dto.response.ImportPreviewResponse;
import com.company.project.modules.crm.dto.response.ImportResultResponse;
import com.company.project.modules.crm.file.CrmFileReader;
import com.company.project.modules.crm.file.ParsedTable;
import com.company.project.modules.crm.repository.CrmColumnRepository;
import com.company.project.modules.crm.repository.CrmRowRepository;
import com.company.project.modules.crm.service.CrmAccessPolicy;
import com.company.project.modules.crm.service.CrmAuditService;
import com.company.project.modules.crm.service.CrmImportService;
import com.company.project.modules.crm.service.CrmRowCodec;
import com.company.project.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CrmImportServiceImpl implements CrmImportService {

    private static final int PREVIEW_ROWS = 5;
    private static final int MAX_REPORTED_ISSUES = 20;

    private final CrmFileReader fileReader;
    private final CrmColumnRepository columnRepository;
    private final CrmRowRepository rowRepository;
    private final CrmAccessPolicy accessPolicy;
    private final CrmAuditService auditService;
    private final CrmRowCodec codec;
    private final CrmProperties properties;

    public CrmImportServiceImpl(
            CrmFileReader fileReader,
            CrmColumnRepository columnRepository,
            CrmRowRepository rowRepository,
            CrmAccessPolicy accessPolicy,
            CrmAuditService auditService,
            CrmRowCodec codec,
            CrmProperties properties) {
        this.fileReader = fileReader;
        this.columnRepository = columnRepository;
        this.rowRepository = rowRepository;
        this.accessPolicy = accessPolicy;
        this.auditService = auditService;
        this.codec = codec;
        this.properties = properties;
    }

    @Override
    @PreAuthorize("hasAnyAuthority('EXECUTIVE', 'DEPARTMENT_HEAD')")
    public ImportPreviewResponse preview(String fileName, byte[] content, UserPrincipal caller) {
        List<ParsedTable> tables = fileReader.read(fileName, content);
        List<ImportPreviewResponse.PreviewTable> previews = new ArrayList<>();
        for (int index = 0; index < tables.size(); index++) {
            ParsedTable table = tables.get(index);
            previews.add(new ImportPreviewResponse.PreviewTable(
                    index, table.name(), table.headers(), table.rows().subList(0, Math.min(PREVIEW_ROWS, table.rows().size())), table.rows().size()));
        }
        return new ImportPreviewResponse(previews);
    }

    @Override
    @PreAuthorize("hasAnyAuthority('EXECUTIVE', 'DEPARTMENT_HEAD')")
    @Transactional
    public ImportResultResponse importInto(Long datasetId, String fileName, byte[] content, ImportOptions options, UserPrincipal caller) {
        CrmDatasetEntity dataset = accessPolicy.requireManageable(datasetId, caller);
        List<ParsedTable> tables = fileReader.read(fileName, content);
        if (options.tableIndex() < 0 || options.tableIndex() >= tables.size()) {
            throw new BusinessException("IMPORT_NO_TABLE", "The file has no such table", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        ParsedTable table = tables.get(options.tableIndex());
        if (rowRepository.countByDatasetId(datasetId) + table.rows().size() > properties.maxRowsPerDataset()) {
            throw new BusinessException("DATASET_FULL", "A dataset can hold at most " + properties.maxRowsPerDataset() + " customers", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        List<CrmColumnEntity> columns = new ArrayList<>(columnRepository.findAllActiveByDatasetId(datasetId));
        Map<Integer, CrmColumnEntity> targets = resolveMapping(datasetId, options, table, columns);

        Map<String, Long> byEmail = new HashMap<>();
        Map<String, Long> byPhone = new HashMap<>();
        for (CrmRowRepository.RowHashes hashes : rowRepository.findHashesByDatasetId(datasetId)) {
            if (hashes.getEmailHash() != null) {
                byEmail.put(hashes.getEmailHash(), hashes.getId());
            }
            if (hashes.getPhoneHash() != null) {
                byPhone.put(hashes.getPhoneHash(), hashes.getId());
            }
        }

        Long companyId = dataset.getCompanyId();
        Set<String> seenEmails = new HashSet<>();
        Set<String> seenPhones = new HashSet<>();
        List<CrmRowEntity> toCreate = new ArrayList<>();
        Map<Long, Map<Long, String>> toUpdate = new LinkedHashMap<>();
        List<ImportResultResponse.Issue> issues = new ArrayList<>();
        int skipped = 0;
        int rejected = 0;

        for (int index = 0; index < table.rows().size(); index++) {
            List<String> cells = table.rows().get(index);
            Map<Long, String> raw = new HashMap<>();
            targets.forEach((sourceIndex, column) -> raw.put(column.getId(), cells.get(sourceIndex)));

            CrmRowCodec.Normalized normalized = codec.normalize(columns, raw);
            if (!normalized.problems().isEmpty()) {
                rejected++;
                for (CrmRowCodec.CellProblem problem : normalized.problems()) {
                    if (issues.size() < MAX_REPORTED_ISSUES) {
                        issues.add(new ImportResultResponse.Issue(index + 2, problem.columnName(), problem.problem().name()));
                    }
                }
                continue;
            }
            Map<Long, String> values = normalized.values();
            if (values.isEmpty()) {
                continue;
            }

            String emailHash = codec.emailHash(companyId, columns, values);
            String phoneHash = codec.phoneHash(companyId, columns, values);
            boolean repeatedInFile = (emailHash != null && seenEmails.contains(emailHash)) || (phoneHash != null && seenPhones.contains(phoneHash));
            if (emailHash != null) {
                seenEmails.add(emailHash);
            }
            if (phoneHash != null) {
                seenPhones.add(phoneHash);
            }
            if (repeatedInFile) {
                skipped++;
                continue;
            }

            Long existingId = emailHash != null && byEmail.containsKey(emailHash) ? byEmail.get(emailHash)
                    : phoneHash != null ? byPhone.get(phoneHash) : null;
            if (existingId != null) {
                if (options.duplicatePolicy() == DuplicatePolicy.UPDATE) {
                    toUpdate.computeIfAbsent(existingId, id -> new HashMap<>()).putAll(values);
                } else {
                    skipped++;
                }
                continue;
            }
            toCreate.add(new CrmRowEntity(datasetId, companyId, codec.encode(companyId, values), emailHash, phoneHash, caller.getUserId()));
        }

        int updated = applyUpdates(toUpdate, columns, companyId);
        skipped += toUpdate.size() - updated;
        rowRepository.saveAll(toCreate);

        auditService.record(caller, CrmAuditAction.IMPORT, datasetId,
                "created=" + toCreate.size() + " updated=" + updated + " skipped=" + skipped + " rejected=" + rejected);
        return new ImportResultResponse(toCreate.size(), updated, skipped, rejected, issues);
    }

    /**
     * Matches columns of the file to columns of the dataset, creating the new ones the mapping asks for. {@code columns}
     * grows with them. Returns the target column by index of the file's column.
     */
    private Map<Integer, CrmColumnEntity> resolveMapping(Long datasetId, ImportOptions options, ParsedTable table, List<CrmColumnEntity> columns) {
        Map<Integer, CrmColumnEntity> targets = new LinkedHashMap<>();
        Set<Long> usedColumns = new HashSet<>();
        int nextPosition = columns.stream().mapToInt(CrmColumnEntity::getPosition).max().orElse(0) + 1;
        Map<Long, CrmColumnEntity> byId = columns.stream().collect(Collectors.toMap(CrmColumnEntity::getId, c -> c));

        for (ImportOptions.ColumnMapping mapping : options.mappings()) {
            if (mapping.sourceIndex() < 0 || mapping.sourceIndex() >= table.headers().size() || targets.containsKey(mapping.sourceIndex())) {
                throw new BusinessException("INVALID_MAPPING", "The column mapping does not match the table", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            CrmColumnEntity target;
            if (mapping.columnId() != null) {
                if (mapping.newName() != null || mapping.newType() != null) {
                    throw new BusinessException("INVALID_MAPPING", "A mapping goes to an existing column or a new one, not both", HttpStatus.UNPROCESSABLE_ENTITY);
                }
                target = byId.get(mapping.columnId());
                if (target == null || !usedColumns.add(target.getId())) {
                    throw new BusinessException("INVALID_MAPPING", "The column mapping does not match the dataset", HttpStatus.UNPROCESSABLE_ENTITY);
                }
            } else {
                String name = mapping.newName() == null ? "" : mapping.newName().strip();
                if (name.isEmpty() || mapping.newType() == null) {
                    throw new BusinessException("INVALID_MAPPING", "A new column needs a name and a type", HttpStatus.UNPROCESSABLE_ENTITY);
                }
                if (columns.size() >= properties.maxColumns()) {
                    throw new BusinessException("TOO_MANY_COLUMNS", "A dataset can have at most " + properties.maxColumns() + " columns", HttpStatus.UNPROCESSABLE_ENTITY);
                }
                if (columns.stream().anyMatch(column -> column.getName().equalsIgnoreCase(name))) {
                    throw new BusinessException("COLUMN_NAME_TAKEN", "This dataset already has a column with that name", HttpStatus.CONFLICT);
                }
                target = columnRepository.save(new CrmColumnEntity(datasetId, name, mapping.newType(), nextPosition++));
                columns.add(target);
                usedColumns.add(target.getId());
            }
            targets.put(mapping.sourceIndex(), target);
        }
        return targets;
    }

    /** Merges the file's values into the existing customers; returns how many were changed (a clash with another customer's email is left alone). */
    private int applyUpdates(Map<Long, Map<Long, String>> toUpdate, List<CrmColumnEntity> columns, Long companyId) {
        if (toUpdate.isEmpty()) {
            return 0;
        }
        int updated = 0;
        for (CrmRowEntity row : rowRepository.findAllById(toUpdate.keySet())) {
            Map<Long, String> values = new HashMap<>(codec.decode(companyId, row.getData()));
            values.putAll(toUpdate.get(row.getId()));
            String emailHash = codec.emailHash(companyId, columns, values);
            String phoneHash = codec.phoneHash(companyId, columns, values);
            boolean clashes = (emailHash != null && rowRepository.existsByDatasetIdAndEmailHashAndIdNot(row.getDatasetId(), emailHash, row.getId()))
                    || (phoneHash != null && rowRepository.existsByDatasetIdAndPhoneHashAndIdNot(row.getDatasetId(), phoneHash, row.getId()));
            if (clashes) {
                continue;
            }
            row.replaceData(codec.encode(companyId, values), emailHash, phoneHash);
            updated++;
        }
        return updated;
    }
}
