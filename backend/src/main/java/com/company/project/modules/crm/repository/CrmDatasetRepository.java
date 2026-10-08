package com.company.project.modules.crm.repository;

import com.company.project.modules.crm.domain.CrmDatasetEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CrmDatasetRepository extends JpaRepository<CrmDatasetEntity, Long> {

    @Query("select d from CrmDatasetEntity d where d.id = :id and d.deleted = false")
    Optional<CrmDatasetEntity> findActiveById(@Param("id") Long id);

    @Query("select d from CrmDatasetEntity d where d.companyId = :companyId and d.deleted = false order by d.name")
    List<CrmDatasetEntity> findAllActiveByCompanyId(@Param("companyId") Long companyId);
}
