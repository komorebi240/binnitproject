package com.company.project.modules.projects.repository;

import com.company.project.modules.projects.domain.ProjectMemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectMemberRepository extends JpaRepository<ProjectMemberEntity, Long> {

    @Query("select m from ProjectMemberEntity m where m.projectId = :projectId and m.deleted = false order by m.id")
    List<ProjectMemberEntity> findAllActiveByProjectId(@Param("projectId") Long projectId);

    @Query("select m from ProjectMemberEntity m where m.projectId in :projectIds and m.deleted = false")
    List<ProjectMemberEntity> findAllActiveByProjectIds(@Param("projectIds") List<Long> projectIds);

    @Query("select m from ProjectMemberEntity m where m.projectId = :projectId and m.userId = :userId and m.deleted = false")
    Optional<ProjectMemberEntity> findActive(@Param("projectId") Long projectId, @Param("userId") Long userId);

    @Query("select m from ProjectMemberEntity m where m.userId = :userId and m.deleted = false")
    List<ProjectMemberEntity> findAllActiveByUserId(@Param("userId") Long userId);
}
