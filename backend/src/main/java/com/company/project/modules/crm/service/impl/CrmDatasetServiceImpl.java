package com.company.project.modules.crm.service.impl;

import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.crm.CrmProperties;
import com.company.project.modules.crm.domain.CrmAuditAction;
import com.company.project.modules.crm.domain.CrmColumnEntity;
import com.company.project.modules.crm.domain.CrmColumnType;
import com.company.project.modules.crm.domain.CrmDatasetEntity;
import com.company.project.modules.crm.domain.CrmRowEntity;
import com.company.project.modules.crm.dto.request.CreateColumnRequest;
import com.company.project.modules.crm.dto.request.CreateDatasetRequest;
import com.company.project.modules.crm.dto.request.RenameColumnRequest;
import com.company.project.modules.crm.dto.request.UpdateDatasetRequest;
import com.company.project.modules.crm.dto.response.ColumnResponse;
import com.company.project.modules.crm.dto.response.DatasetDetailResponse;
import com.company.project.modules.crm.dto.response.DatasetResponse;
import com.company.project.modules.crm.repository.CrmColumnRepository;
import com.company.project.modules.crm.repository.CrmDatasetRepository;
import com.company.project.modules.crm.repository.CrmRowRepository;
import com.company.project.modules.crm.service.CrmAccessPolicy;
import com.company.project.modules.crm.service.CrmAuditService;
import com.company.project.modules.crm.service.CrmDatasetService;
import com.company.project.modules.crm.service.CrmRowCodec;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.security.UserPrincipal;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CrmDatasetServiceImpl implements CrmDatasetService {

    private final CrmDatasetRepository datasetRepository;
    private final CrmColumnRepository columnRepository;
    private final CrmRowRepository rowRepository;
    private final DepartmentRepository departmentRepository;
    private final CrmAccessPolicy accessPolicy;
    private final CrmAuditService auditService;
    private final CrmRowCodec codec;
    private final CrmProperties properties;
    private final MessageSource messages;

    public CrmDatasetServiceImpl(
            CrmDatasetRepository datasetRepository,
            CrmColumnRepository columnRepository,
            CrmRowRepository rowRepository,
            DepartmentRepository departmentRepository,
            CrmAccessPolicy accessPolicy,
            CrmAuditService auditService,
            CrmRowCodec codec,
            CrmProperties properties,
            MessageSource messages) {
        this.datasetRepository = datasetRepository;
        this.columnRepository = columnRepository;
        this.rowRepository = rowRepository;
        this.departmentRepository = departmentRepository;
        this.accessPolicy = accessPolicy;
        this.auditService = auditService;
        this.codec = codec;
        this.properties = properties;
        this.messages = messages;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DatasetResponse> list(UserPrincipal caller) {
        List<CrmDatasetEntity> datasets = datasetRepository.findAllActiveByCompanyId(caller.getCompanyId()).stream()
                .filter(dataset -> accessPolicy.canUse(dataset, caller))
                .toList();
        Map<Long, Long> counts = rowRepository.countByCompanyIdGroupedByDataset(caller.getCompanyId()).stream()
                .collect(Collectors.toMap(CrmRowRepository.RowCount::getDatasetId, CrmRowRepository.RowCount::getTotal));
        Map<Long, String> departmentNames = departmentNames(caller.getCompanyId());
        return datasets.stream()
                .map(dataset -> toResponse(dataset, counts.getOrDefault(dataset.getId(), 0L), departmentNames, caller))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DatasetDetailResponse get(Long datasetId, UserPrincipal caller) {
        CrmDatasetEntity dataset = accessPolicy.requireUsable(datasetId, caller);
        return new DatasetDetailResponse(
                toResponse(dataset, rowRepository.countByDatasetId(datasetId), departmentNames(caller.getCompanyId()), caller),
                columnsOf(datasetId));
    }

    @Override
    @Transactional
    public DatasetDetailResponse create(CreateDatasetRequest request, UserPrincipal caller) {
        requireMayPlaceIn(request.departmentId(), caller);
        CrmDatasetEntity dataset = datasetRepository.save(new CrmDatasetEntity(
                caller.getCompanyId(), request.name().strip(), request.sourceType(), blankToNull(request.description()),
                request.departmentId(), caller.getUserId()));

        Locale locale = LocaleContextHolder.getLocale();
        List<ColumnResponse> columns = List.of(
                        new CrmColumnEntity(dataset.getId(), messages.getMessage("crm.column.name", null, locale), CrmColumnType.TEXT, 1),
                        new CrmColumnEntity(dataset.getId(), messages.getMessage("crm.column.email", null, locale), CrmColumnType.EMAIL, 2),
                        new CrmColumnEntity(dataset.getId(), messages.getMessage("crm.column.phone", null, locale), CrmColumnType.PHONE, 3))
                .stream()
                .map(columnRepository::save)
                .map(CrmDatasetServiceImpl::toResponse)
                .toList();

        auditService.record(caller, CrmAuditAction.DATASET_CREATED, dataset.getId(), "source=" + dataset.getSourceType());
        return new DatasetDetailResponse(toResponse(dataset, 0, departmentNames(caller.getCompanyId()), caller), columns);
    }

    @Override
    @Transactional
    public DatasetResponse update(Long datasetId, UpdateDatasetRequest request, UserPrincipal caller) {
        CrmDatasetEntity dataset = accessPolicy.requireManageable(datasetId, caller);
        requireMayPlaceIn(request.departmentId(), caller);
        dataset.update(request.name().strip(), request.sourceType(), blankToNull(request.description()), request.departmentId());
        auditService.record(caller, CrmAuditAction.DATASET_UPDATED, datasetId, "source=" + request.sourceType());
        return toResponse(dataset, rowRepository.countByDatasetId(datasetId), departmentNames(caller.getCompanyId()), caller);
    }

    @Override
    @Transactional
    public void delete(Long datasetId, UserPrincipal caller) {
        CrmDatasetEntity dataset = accessPolicy.requireManageable(datasetId, caller);
        int removed = rowRepository.deleteAllByDatasetId(datasetId);
        dataset.markDeleted();
        columnRepository.findAllActiveByDatasetId(datasetId).forEach(CrmColumnEntity::markDeleted);
        auditService.record(caller, CrmAuditAction.DATASET_DELETED, datasetId, "rows=" + removed);
    }

    @Override
    @Transactional
    public ColumnResponse addColumn(Long datasetId, CreateColumnRequest request, UserPrincipal caller) {
        accessPolicy.requireManageable(datasetId, caller);
        List<CrmColumnEntity> existing = columnRepository.findAllActiveByDatasetId(datasetId);
        if (existing.size() >= properties.maxColumns()) {
            throw new BusinessException("TOO_MANY_COLUMNS", "A dataset can have at most " + properties.maxColumns() + " columns", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        String name = request.name().strip();
        requireNameFree(existing, name, null);
        CrmColumnEntity column = columnRepository.save(
                new CrmColumnEntity(datasetId, name, request.dataType(), columnRepository.maxPosition(datasetId) + 1));
        auditService.record(caller, CrmAuditAction.COLUMN_ADDED, datasetId, "type=" + request.dataType());
        return toResponse(column);
    }

    @Override
    @Transactional
    public ColumnResponse renameColumn(Long columnId, RenameColumnRequest request, UserPrincipal caller) {
        CrmColumnEntity column = requireColumn(columnId);
        accessPolicy.requireManageable(column.getDatasetId(), caller);
        String name = request.name().strip();
        requireNameFree(columnRepository.findAllActiveByDatasetId(column.getDatasetId()), name, columnId);
        column.rename(name);
        auditService.record(caller, CrmAuditAction.COLUMN_RENAMED, column.getDatasetId(), null);
        return toResponse(column);
    }

    @Override
    @Transactional
    public void deleteColumn(Long columnId, UserPrincipal caller) {
        CrmColumnEntity column = requireColumn(columnId);
        accessPolicy.requireManageable(column.getDatasetId(), caller);
        column.markDeleted();
        columnRepository.flush();

        // The values of the column must go from every customer too, and the duplicate keys may move to another column.
        List<CrmColumnEntity> remaining = columnRepository.findAllActiveByDatasetId(column.getDatasetId());
        for (CrmRowEntity row : rowRepository.findAllByDatasetId(column.getDatasetId())) {
            Map<Long, String> values = new HashMap<>(codec.decode(row.getCompanyId(), row.getData()));
            values.remove(columnId);
            row.replaceData(
                    codec.encode(row.getCompanyId(), values),
                    codec.emailHash(row.getCompanyId(), remaining, values),
                    codec.phoneHash(row.getCompanyId(), remaining, values));
        }
        auditService.record(caller, CrmAuditAction.COLUMN_DELETED, column.getDatasetId(), "type=" + column.getDataType());
    }

    private CrmColumnEntity requireColumn(Long columnId) {
        return columnRepository.findActiveById(columnId).orElseThrow(() -> new ResourceNotFoundException("Column", columnId));
    }

    private void requireNameFree(List<CrmColumnEntity> columns, String name, Long exceptColumnId) {
        boolean taken = columns.stream()
                .anyMatch(column -> !column.getId().equals(exceptColumnId) && column.getName().equalsIgnoreCase(name));
        if (taken) {
            throw new BusinessException("COLUMN_NAME_TAKEN", "This dataset already has a column with that name", HttpStatus.CONFLICT);
        }
    }

    /** The caller may create or move a dataset into that department (or make it executives-only with null), and it must be theirs. */
    private void requireMayPlaceIn(Long departmentId, UserPrincipal caller) {
        if (!accessPolicy.canCreateFor(departmentId, caller)) {
            throw new AccessDeniedException("You cannot create or move a dataset for that department");
        }
        if (departmentId != null) {
            departmentRepository.findActiveById(departmentId)
                    .filter(department -> department.getCompanyId().equals(caller.getCompanyId()))
                    .orElseThrow(() -> new ResourceNotFoundException("Department", departmentId));
        }
    }

    private List<ColumnResponse> columnsOf(Long datasetId) {
        return columnRepository.findAllActiveByDatasetId(datasetId).stream().map(CrmDatasetServiceImpl::toResponse).toList();
    }

    private Map<Long, String> departmentNames(Long companyId) {
        return departmentRepository.findAllActiveByCompanyId(companyId).stream()
                .collect(Collectors.toMap(DepartmentEntity::getId, DepartmentEntity::getName, (a, b) -> a));
    }

    private DatasetResponse toResponse(CrmDatasetEntity dataset, long rowCount, Map<Long, String> departmentNames, UserPrincipal caller) {
        return new DatasetResponse(
                dataset.getId(), dataset.getName(), dataset.getSourceType(), dataset.getDescription(), dataset.getDepartmentId(),
                dataset.getDepartmentId() == null ? null : departmentNames.get(dataset.getDepartmentId()),
                rowCount, accessPolicy.canManage(dataset, caller), dataset.getCreatedAt());
    }

    private static ColumnResponse toResponse(CrmColumnEntity column) {
        return new ColumnResponse(column.getId(), column.getName(), column.getDataType(), column.getPosition());
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.strip();
    }
}
