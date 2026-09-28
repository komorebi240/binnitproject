package com.company.project.modules.identity.repository;

import com.company.project.modules.identity.domain.DepartmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<DepartmentEntity, Long> {

    @Query("select d from DepartmentEntity d where d.id = :id and d.deleted = false")
    Optional<DepartmentEntity> findActiveById(@Param("id") Long id);

    @Query("select d from DepartmentEntity d where d.companyId = :companyId and d.deleted = false order by d.name")
    List<DepartmentEntity> findAllActiveByCompanyId(@Param("companyId") Long companyId);
}
