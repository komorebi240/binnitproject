package com.company.project.modules.notifications.repository;

import com.company.project.modules.notifications.domain.NotificationEntity;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {

    @Query("select n from NotificationEntity n where n.userId = :userId order by n.createdAt desc")
    List<NotificationEntity> findRecentByUserId(@Param("userId") Long userId, Limit limit);

    long countByUserIdAndReadFalse(Long userId);

    List<NotificationEntity> findAllByUserIdAndReadFalse(Long userId);

    @Query("select n from NotificationEntity n where n.id = :id and n.userId = :userId")
    Optional<NotificationEntity> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);
}
