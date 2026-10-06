package com.company.project.modules.projects.repository;

import com.company.project.modules.projects.domain.ProjectFolderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectFolderRepository extends JpaRepository<ProjectFolderEntity, Long> {

    @Query("select f from ProjectFolderEntity f where f.projectId = :projectId and f.deleted = false order by f.id")
    List<ProjectFolderEntity> findAllActiveByProjectId(@Param("projectId") Long projectId);

    @Query("select f from ProjectFolderEntity f where f.id = :id and f.projectId = :projectId and f.deleted = false")
    Optional<ProjectFolderEntity> findActive(@Param("id") Long id, @Param("projectId") Long projectId);

    @Query("select count(f) > 0 from ProjectFolderEntity f where f.projectId = :projectId and f.catalogFolderId = :catalogFolderId and f.deleted = false")
    boolean existsActive(@Param("projectId") Long projectId, @Param("catalogFolderId") Long catalogFolderId);
}
