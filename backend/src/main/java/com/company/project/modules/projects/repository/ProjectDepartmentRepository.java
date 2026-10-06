package com.company.project.modules.projects.repository;

import com.company.project.modules.projects.domain.ProjectDepartmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectDepartmentRepository extends JpaRepository<ProjectDepartmentEntity, Long> {

    @Query("select d from ProjectDepartmentEntity d where d.projectId = :projectId and d.deleted = false order by d.id")
    List<ProjectDepartmentEntity> findAllActiveByProjectId(@Param("projectId") Long projectId);

    @Query("select d from ProjectDepartmentEntity d where d.projectId in :projectIds and d.deleted = false")
    List<ProjectDepartmentEntity> findAllActiveByProjectIds(@Param("projectIds") List<Long> projectIds);

    @Query("select d from ProjectDepartmentEntity d where d.projectId = :projectId and d.departmentId = :departmentId and d.deleted = false")
    Optional<ProjectDepartmentEntity> findActive(@Param("projectId") Long projectId, @Param("departmentId") Long departmentId);

    @Query("select d from ProjectDepartmentEntity d where d.departmentId = :departmentId and d.deleted = false")
    List<ProjectDepartmentEntity> findAllActiveByDepartmentId(@Param("departmentId") Long departmentId);
}
