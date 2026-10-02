package com.company.project.modules.messages.repository;

import com.company.project.modules.messages.domain.MessageArchiveEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageArchiveRepository extends JpaRepository<MessageArchiveEntity, Long> {

    List<MessageArchiveEntity> findAllByUserId(Long userId);

    boolean existsByUserIdAndOtherUserId(Long userId, Long otherUserId);

    @Modifying
    @Query("delete from MessageArchiveEntity a where a.userId = :userId and a.otherUserId = :otherUserId")
    void deleteByPair(@Param("userId") Long userId, @Param("otherUserId") Long otherUserId);

    /** Un-archives every conversation anyone had with {@code otherUserId} (used when that user broadcasts). */
    @Modifying
    @Query("delete from MessageArchiveEntity a where a.otherUserId = :otherUserId")
    void deleteAllByOtherUser(@Param("otherUserId") Long otherUserId);
}
