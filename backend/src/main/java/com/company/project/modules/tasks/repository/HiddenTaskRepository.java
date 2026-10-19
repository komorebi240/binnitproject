package com.company.project.modules.tasks.repository;

import com.company.project.modules.tasks.domain.HiddenTaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Set;

public interface HiddenTaskRepository extends JpaRepository<HiddenTaskEntity, Long> {

    /** By user only, never with a list of task ids: an executive's list can pass SQL Server's 2,100-parameter limit. */
    @Query("select h.taskId from HiddenTaskEntity h where h.userId = :userId")
    Set<Long> findTaskIdsByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("delete from HiddenTaskEntity h where h.userId = :userId and h.taskId in :taskIds")
    int deleteForUser(@Param("userId") Long userId, @Param("taskIds") Collection<Long> taskIds);

    /** A task that is no longer finished comes back for everyone who had cleared it. */
    @Modifying
    @Query("delete from HiddenTaskEntity h where h.taskId = :taskId")
    void deleteByTaskId(@Param("taskId") Long taskId);
}
