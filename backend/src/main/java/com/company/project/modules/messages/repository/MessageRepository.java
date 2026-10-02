package com.company.project.modules.messages.repository;

import com.company.project.modules.messages.domain.MessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<MessageEntity, Long> {

    @Query("""
            select m from MessageEntity m
            where (m.senderId = :userId or m.recipientId = :userId)
            order by m.createdAt desc
            """)
    List<MessageEntity> findAllInvolvingUser(@Param("userId") Long userId);

    @Query("""
            select m from MessageEntity m
            where (m.senderId = :userId and m.recipientId = :otherUserId)
               or (m.senderId = :otherUserId and m.recipientId = :userId)
            order by m.createdAt asc
            """)
    List<MessageEntity> findThreadBetween(@Param("userId") Long userId, @Param("otherUserId") Long otherUserId);

    List<MessageEntity> findAllBySenderIdAndRecipientIdAndReadFalse(Long senderId, Long recipientId);
}
