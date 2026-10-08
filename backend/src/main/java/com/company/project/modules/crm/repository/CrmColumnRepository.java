package com.company.project.modules.crm.repository;

import com.company.project.modules.crm.domain.CrmColumnEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CrmColumnRepository extends JpaRepository<CrmColumnEntity, Long> {

    @Query("select c from CrmColumnEntity c where c.datasetId = :datasetId and c.deleted = false order by c.position, c.id")
    List<CrmColumnEntity> findAllActiveByDatasetId(@Param("datasetId") Long datasetId);

    @Query("select c from CrmColumnEntity c where c.id = :id and c.deleted = false")
    Optional<CrmColumnEntity> findActiveById(@Param("id") Long id);

    @Query("select coalesce(max(c.position), 0) from CrmColumnEntity c where c.datasetId = :datasetId")
    int maxPosition(@Param("datasetId") Long datasetId);
}
