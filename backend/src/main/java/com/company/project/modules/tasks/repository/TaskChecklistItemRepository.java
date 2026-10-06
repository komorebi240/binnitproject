package com.company.project.modules.tasks.repository;

import com.company.project.modules.tasks.domain.TaskChecklistItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface TaskChecklistItemRepository extends JpaRepository<TaskChecklistItemEntity, Long> {

    List<TaskChecklistItemEntity> findAllByTaskIdInOrderBySortOrderAscIdAsc(Collection<Long> taskIds);

    List<TaskChecklistItemEntity> findAllByTaskIdOrderBySortOrderAscIdAsc(Long taskId);

    long countByTaskId(Long taskId);
}
