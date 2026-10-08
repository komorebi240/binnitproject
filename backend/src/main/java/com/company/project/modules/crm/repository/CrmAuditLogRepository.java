package com.company.project.modules.crm.repository;

import com.company.project.modules.crm.domain.CrmAuditLogEntity;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CrmAuditLogRepository extends JpaRepository<CrmAuditLogEntity, Long> {

    @Query("select a from CrmAuditLogEntity a where a.companyId = :companyId order by a.createdAt desc, a.id desc")
    List<CrmAuditLogEntity> findRecentByCompanyId(@Param("companyId") Long companyId, Limit limit);
}
