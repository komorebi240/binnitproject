package com.company.project.modules.crm.service.impl;

import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.crm.CrmProperties;
import com.company.project.modules.crm.domain.CrmAuditAction;
import com.company.project.modules.crm.domain.CrmColumnEntity;
import com.company.project.modules.crm.domain.CrmDatasetEntity;
import com.company.project.modules.crm.domain.CrmRowEntity;
import com.company.project.modules.crm.dto.request.SaveRowRequest;
import com.company.project.modules.crm.dto.response.RowPageResponse;
import com.company.project.modules.crm.dto.response.RowResponse;
import com.company.project.modules.crm.repository.CrmColumnRepository;
import com.company.project.modules.crm.repository.CrmRowRepository;
import com.company.project.modules.crm.service.CrmAccessPolicy;
import com.company.project.modules.crm.service.CrmAuditService;
import com.company.project.modules.crm.service.CrmRowCodec;
import com.company.project.modules.crm.service.CrmRowService;
import com.company.project.security.UserPrincipal;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Service
public class CrmRowServiceImpl implements CrmRowService {

    private static final int MAX_PAGE_SIZE = 200;

    private final CrmRowRepository rowRepository;
    private final CrmColumnRepository columnRepository;
    private final CrmAccessPolicy accessPolicy;
    private final CrmAuditService auditService;
    private final CrmRowCodec codec;
    private final CrmProperties properties;
    private final MessageSource messages;

    public CrmRowServiceImpl(
            CrmRowRepository rowRepository,
            CrmColumnRepository columnRepository,
            CrmAccessPolicy accessPolicy,
            CrmAuditService auditService,
            CrmRowCodec codec,
            CrmProperties properties,
            MessageSource messages) {
        this.rowRepository = rowRepository;
        this.columnRepository = columnRepository;
        this.accessPolicy = accessPolicy;
        this.auditService = auditService;
        this.codec = codec;
        this.properties = properties;
        this.messages = messages;
    }

    @Override
    @Transactional(readOnly = true)
    public RowPageResponse list(Long datasetId, int page, int size, String query, UserPrincipal caller) {
        CrmDatasetEntity dataset = accessPolicy.requireUsable(datasetId, caller);
        boolean manager = accessPolicy.canManage(dataset, caller);
        Predicate<CrmRowEntity> canDelete = row -> manager || row.getCreatedByUserId().equals(caller.getUserId());
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Set<Long> columnIds = columnIds(columnRepository.findAllActiveByDatasetId(datasetId));

        if (query == null || query.isBlank()) {
            Page<CrmRowEntity> found = rowRepository.findPageByDatasetId(datasetId, PageRequest.of(safePage, safeSize));
            return new RowPageResponse(found.map(row -> toResponse(row, columnIds, canDelete)).getContent(), safePage, safeSize, found.getTotalElements());
        }

        String needle = fold(query);
        List<RowResponse> matches = rowRepository.findAllByDatasetId(datasetId).stream()
                .map(row -> toResponse(row, columnIds, canDelete))
                .filter(row -> row.values().values().stream().anyMatch(value -> fold(value).contains(needle)))
                .toList();
        int from = Math.min(safePage * safeSize, matches.size());
        return new RowPageResponse(matches.subList(from, Math.min(from + safeSize, matches.size())), safePage, safeSize, matches.size());
    }

    @Override
    @Transactional
    public RowResponse add(Long datasetId, SaveRowRequest request, UserPrincipal caller) {
        CrmDatasetEntity dataset = accessPolicy.requireUsable(datasetId, caller);
        if (rowRepository.countByDatasetId(datasetId) >= properties.maxRowsPerDataset()) {
            throw new BusinessException("DATASET_FULL", "A dataset can hold at most " + properties.maxRowsPerDataset() + " customers", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        List<CrmColumnEntity> columns = columnRepository.findAllActiveByDatasetId(datasetId);
        Map<Long, String> values = checkedValues(columns, request.values());
        String emailHash = codec.emailHash(dataset.getCompanyId(), columns, values);
        String phoneHash = codec.phoneHash(dataset.getCompanyId(), columns, values);
        requireNotDuplicate(datasetId, emailHash, phoneHash, null);

        CrmRowEntity row = rowRepository.save(new CrmRowEntity(
                datasetId, dataset.getCompanyId(), codec.encode(dataset.getCompanyId(), values), emailHash, phoneHash, caller.getUserId()));
        return new RowResponse(row.getId(), values, true);
    }

    @Override
    @Transactional
    public RowResponse update(Long rowId, SaveRowRequest request, UserPrincipal caller) {
        CrmRowEntity row = requireRow(rowId, caller);
        List<CrmColumnEntity> columns = columnRepository.findAllActiveByDatasetId(row.getDatasetId());
        Set<Long> columnIds = columnIds(columns);

        Map<Long, String> changes = checkedValues(columns, request.values());
        Map<Long, String> values = new HashMap<>(codec.decode(row.getCompanyId(), row.getData()));
        values.keySet().retainAll(columnIds);
        for (Long columnId : request.values().keySet()) {
            String value = changes.get(columnId);
            if (value == null) {
                values.remove(columnId);
            } else {
                values.put(columnId, value);
            }
        }

        String emailHash = codec.emailHash(row.getCompanyId(), columns, values);
        String phoneHash = codec.phoneHash(row.getCompanyId(), columns, values);
        requireNotDuplicate(row.getDatasetId(), emailHash, phoneHash, rowId);
        row.replaceData(codec.encode(row.getCompanyId(), values), emailHash, phoneHash);
        return new RowResponse(rowId, values, canDelete(row, caller));
    }

    @Override
    @Transactional
    public void delete(Long rowId, UserPrincipal caller) {
        CrmRowEntity row = requireRow(rowId, caller);
        if (!canDelete(row, caller)) {
            throw new AccessDeniedException("Only whoever added a customer, or a manager of the dataset, can delete it");
        }
        rowRepository.delete(row);
        auditService.record(caller, CrmAuditAction.ROW_DELETED, row.getDatasetId(), "rows=1");
    }

    /** The row, if it is in a dataset the caller may use (another company's rows, and rows the caller may not use, are "not found"). */
    private CrmRowEntity requireRow(Long rowId, UserPrincipal caller) {
        CrmRowEntity row = rowRepository.findByIdAndCompanyId(rowId, caller.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Row", rowId));
        accessPolicy.requireUsable(row.getDatasetId(), caller);
        return row;
    }

    /** The cleaned values of the request; refuses a column that is not the dataset's and any cell that does not fit its column. */
    private Map<Long, String> checkedValues(List<CrmColumnEntity> columns, Map<Long, String> raw) {
        Set<Long> columnIds = columnIds(columns);
        for (Long id : raw.keySet()) {
            if (!columnIds.contains(id)) {
                throw new BusinessException("UNKNOWN_COLUMN", "The dataset has no column " + id, HttpStatus.UNPROCESSABLE_ENTITY);
            }
        }
        var normalized = codec.normalize(columns, raw);
        if (!normalized.problems().isEmpty()) {
            var first = normalized.problems().get(0);
            // The column's name and the reason, in the language of the request; never the value that was typed.
            String reason = messages.getMessage("crm.problem." + first.problem(), new Object[] {first.columnName()}, LocaleContextHolder.getLocale());
            throw new BusinessException("INVALID_CELL", reason, HttpStatus.UNPROCESSABLE_ENTITY);
        }
        return normalized.values();
    }

    private void requireNotDuplicate(Long datasetId, String emailHash, String phoneHash, Long exceptRowId) {
        // -1 matches no row: "any row except none".
        Long except = exceptRowId == null ? -1L : exceptRowId;
        if (emailHash != null && rowRepository.existsByDatasetIdAndEmailHashAndIdNot(datasetId, emailHash, except)) {
            throw new BusinessException("DUPLICATE_ROW", "A customer with this email is already in the dataset", HttpStatus.CONFLICT);
        }
        if (phoneHash != null && rowRepository.existsByDatasetIdAndPhoneHashAndIdNot(datasetId, phoneHash, except)) {
            throw new BusinessException("DUPLICATE_ROW", "A customer with this phone number is already in the dataset", HttpStatus.CONFLICT);
        }
    }

    private RowResponse toResponse(CrmRowEntity row, Set<Long> columnIds, Predicate<CrmRowEntity> canDelete) {
        Map<Long, String> values = new HashMap<>(codec.decode(row.getCompanyId(), row.getData()));
        values.keySet().retainAll(columnIds);
        return new RowResponse(row.getId(), values, canDelete.test(row));
    }

    private boolean canDelete(CrmRowEntity row, UserPrincipal caller) {
        CrmDatasetEntity dataset = accessPolicy.requireUsable(row.getDatasetId(), caller);
        return accessPolicy.canManage(dataset, caller) || row.getCreatedByUserId().equals(caller.getUserId());
    }

    private static Set<Long> columnIds(List<CrmColumnEntity> columns) {
        return columns.stream().map(CrmColumnEntity::getId).collect(Collectors.toCollection(HashSet::new));
    }

    /** Lower case without accents, so "nguyen" finds "Nguyễn". */
    static String fold(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "").replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT);
    }
}
