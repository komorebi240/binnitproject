package com.company.project.modules.tasks.repository;

import com.company.project.modules.tasks.domain.TaskAttachmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface TaskAttachmentRepository extends JpaRepository<TaskAttachmentEntity, Long> {

    List<TaskAttachmentEntity> findAllByTaskIdIn(Collection<Long> taskIds);

    long countByTaskId(Long taskId);
}
