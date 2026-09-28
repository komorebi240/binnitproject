package com.company.project.modules.identity.repository;

import com.company.project.modules.identity.domain.PositionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PositionRepository extends JpaRepository<PositionEntity, Long> {

    @Query("select p from PositionEntity p where p.userId = :userId and p.deleted = false")
    Optional<PositionEntity> findActiveByUserId(@Param("userId") Long userId);

    @Query("select p from PositionEntity p where p.userId in :userIds and p.deleted = false")
    List<PositionEntity> findAllActiveByUserIds(@Param("userIds") List<Long> userIds);

    @Query("select p from PositionEntity p where p.departmentId = :departmentId and p.deleted = false")
    List<PositionEntity> findAllActiveByDepartmentId(@Param("departmentId") Long departmentId);

    @Query("select p from PositionEntity p where p.teamId = :teamId and p.deleted = false")
    List<PositionEntity> findAllActiveByTeamId(@Param("teamId") Long teamId);
}
