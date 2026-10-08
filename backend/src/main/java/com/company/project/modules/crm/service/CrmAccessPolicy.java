package com.company.project.modules.crm.service;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.crm.domain.CrmDatasetEntity;
import com.company.project.modules.crm.repository.CrmDatasetRepository;
import com.company.project.security.UserPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * Who may do what with a dataset - the one place these rules live (CLAUDE.md section 9: enforced on the server, from the
 * caller's own identity, never from ids the client sends).
 *
 * <ul>
 *   <li><b>use</b> (see it, read and edit its rows): executives, and the people of the dataset's department. A dataset
 *       with no department is executives' only.</li>
 *   <li><b>manage</b> (rename, delete, add columns, import): executives, and the head of the dataset's department.</li>
 * </ul>
 * Another company's dataset, or one the caller may not use, is simply "not found".
 */
@Component
public class CrmAccessPolicy {

    private final CrmDatasetRepository datasetRepository;

    public CrmAccessPolicy(CrmDatasetRepository datasetRepository) {
        this.datasetRepository = datasetRepository;
    }

    public boolean canUse(CrmDatasetEntity dataset, UserPrincipal caller) {
        if (!dataset.getCompanyId().equals(caller.getCompanyId())) {
            return false;
        }
        return caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE
                || (dataset.getDepartmentId() != null && dataset.getDepartmentId().equals(caller.getDepartmentId()));
    }

    public boolean canManage(CrmDatasetEntity dataset, UserPrincipal caller) {
        if (!canUse(dataset, caller)) {
            return false;
        }
        return caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE || caller.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD;
    }

    /** Whether the caller may create a dataset for {@code departmentId} (null = executives only). */
    public boolean canCreateFor(Long departmentId, UserPrincipal caller) {
        if (caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE) {
            return true;
        }
        return caller.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD
                && departmentId != null && departmentId.equals(caller.getDepartmentId());
    }

    public CrmDatasetEntity requireUsable(Long datasetId, UserPrincipal caller) {
        return datasetRepository.findActiveById(datasetId)
                .filter(dataset -> canUse(dataset, caller))
                .orElseThrow(() -> new ResourceNotFoundException("Dataset", datasetId));
    }

    public CrmDatasetEntity requireManageable(Long datasetId, UserPrincipal caller) {
        CrmDatasetEntity dataset = requireUsable(datasetId, caller);
        if (!canManage(dataset, caller)) {
            throw new AccessDeniedException("Only an executive or the head of the dataset's department can manage it");
        }
        return dataset;
    }
}
