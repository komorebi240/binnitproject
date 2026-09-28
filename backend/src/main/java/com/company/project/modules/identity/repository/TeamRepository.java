package com.company.project.modules.identity.repository;

import com.company.project.modules.identity.domain.TeamEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TeamRepository extends JpaRepository<TeamEntity, Long> {

    @Query("select t from TeamEntity t where t.id = :id and t.deleted = false")
    Optional<TeamEntity> findActiveById(@Param("id") Long id);

    @Query("select t from TeamEntity t where t.departmentId = :departmentId and t.deleted = false order by t.name")
    List<TeamEntity> findAllActiveByDepartmentId(@Param("departmentId") Long departmentId);
}
