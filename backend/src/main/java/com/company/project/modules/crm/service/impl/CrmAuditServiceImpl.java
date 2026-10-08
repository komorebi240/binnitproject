package com.company.project.modules.crm.service.impl;

import com.company.project.modules.crm.domain.CrmAuditAction;
import com.company.project.modules.crm.domain.CrmAuditLogEntity;
import com.company.project.modules.crm.dto.response.AuditLogResponse;
import com.company.project.modules.crm.repository.CrmAuditLogRepository;
import com.company.project.modules.crm.service.CrmAuditService;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.security.UserPrincipal;
import org.springframework.data.domain.Limit;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CrmAuditServiceImpl implements CrmAuditService {

    private static final int RECENT_LIMIT = 200;

    private final CrmAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public CrmAuditServiceImpl(CrmAuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    /** Joins the caller's transaction: an action that rolls back leaves no log line claiming it happened. */
    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void record(UserPrincipal caller, CrmAuditAction action, Long datasetId, String detail) {
        auditLogRepository.save(new CrmAuditLogEntity(caller.getCompanyId(), caller.getUserId(), action, datasetId, detail));
    }

    @Override
    @PreAuthorize("hasAuthority('EXECUTIVE')")
    @Transactional(readOnly = true)
    public List<AuditLogResponse> listRecent(UserPrincipal caller) {
        List<CrmAuditLogEntity> entries = auditLogRepository.findRecentByCompanyId(caller.getCompanyId(), Limit.of(RECENT_LIMIT));
        Map<Long, UserEntity> users = userRepository
                .findAllActiveByIds(entries.stream().map(CrmAuditLogEntity::getUserId).distinct().toList()).stream()
                .collect(Collectors.toMap(UserEntity::getId, Function.identity()));
        return entries.stream()
                .map(entry -> new AuditLogResponse(
                        entry.getId(),
                        users.containsKey(entry.getUserId()) ? users.get(entry.getUserId()).getFullName() : "-",
                        entry.getAction(), entry.getDatasetId(), entry.getDetail(), entry.getCreatedAt()))
                .toList();
    }
}
