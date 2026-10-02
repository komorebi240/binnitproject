package com.company.project.modules.kpi.repository;

import com.company.project.modules.kpi.domain.KpiIncentiveTierEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface KpiIncentiveTierRepository extends JpaRepository<KpiIncentiveTierEntity, Long> {

    @Query("select t from KpiIncentiveTierEntity t where t.companyId = :companyId order by t.sortOrder asc")
    List<KpiIncentiveTierEntity> findAllByCompanyIdOrderBySortOrder(@Param("companyId") Long companyId);

    void deleteAllByCompanyId(Long companyId);
}
