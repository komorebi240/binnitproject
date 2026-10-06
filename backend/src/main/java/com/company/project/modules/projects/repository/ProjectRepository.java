package com.company.project.modules.projects.repository;

import com.company.project.modules.projects.domain.ProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<ProjectEntity, Long> {

    @Query("select p from ProjectEntity p where p.id = :id and p.deleted = false")
    Optional<ProjectEntity> findActiveById(@Param("id") Long id);

    @Query("select p from ProjectEntity p where p.companyId = :companyId and p.deleted = false order by p.createdAt desc")
    List<ProjectEntity> findAllActiveByCompanyId(@Param("companyId") Long companyId);

    @Query("select p from ProjectEntity p where p.id in :ids and p.deleted = false order by p.createdAt desc")
    List<ProjectEntity> findAllActiveByIds(@Param("ids") List<Long> ids);
}
