package com.company.project.modules.tasks.repository;

import com.company.project.modules.tasks.domain.TaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<TaskEntity, Long> {

    @Query("select t from TaskEntity t where t.id = :id and t.deleted = false")
    Optional<TaskEntity> findActiveById(@Param("id") Long id);

    @Query("select t from TaskEntity t where t.companyId = :companyId and t.deleted = false order by t.createdAt desc")
    List<TaskEntity> findAllActiveByCompanyId(@Param("companyId") Long companyId);

    @Query("""
            select t from TaskEntity t where t.deleted = false and (
                t.assigneeUserId = :userId
                or t.assigneeDepartmentId = :departmentId
                or t.assignedByUserId = :userId
            ) order by t.createdAt desc
            """)
    List<TaskEntity> findAllActiveForEmployee(@Param("userId") Long userId, @Param("departmentId") Long departmentId);

    @Query("""
            select t from TaskEntity t where t.deleted = false and (
                t.assigneeDepartmentId = :departmentId
                or (t.assigneeUserId in :memberUserIds)
                or t.assignedByUserId = :callerId
            ) order by t.createdAt desc
            """)
    List<TaskEntity> findAllActiveForDepartmentScope(
            @Param("departmentId") Long departmentId,
            @Param("memberUserIds") List<Long> memberUserIds,
            @Param("callerId") Long callerId);

    @Query("""
            select t from TaskEntity t where t.deleted = false and (
                (t.assigneeUserId in :memberUserIds)
                or t.assignedByUserId = :callerId
            ) order by t.createdAt desc
            """)
    List<TaskEntity> findAllActiveForTeamScope(
            @Param("memberUserIds") List<Long> memberUserIds, @Param("callerId") Long callerId);
}
