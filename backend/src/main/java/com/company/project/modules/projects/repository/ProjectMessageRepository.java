package com.company.project.modules.projects.repository;

import com.company.project.modules.projects.domain.ProjectMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectMessageRepository extends JpaRepository<ProjectMessageEntity, Long> {

    /** The newest 200 lines, newest first (the service flips them for display). */
    List<ProjectMessageEntity> findTop200ByProjectIdOrderByIdDesc(Long projectId);
}
