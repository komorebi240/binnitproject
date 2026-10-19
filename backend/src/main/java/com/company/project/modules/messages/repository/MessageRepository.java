package com.company.project.modules.messages.repository;

import com.company.project.modules.messages.domain.MessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<MessageEntity, Long> {

    /** Every message the user still sees: what they deleted for themselves is left out. */
    @Query("""
            select m from MessageEntity m
            where (m.senderId = :userId and m.hiddenForSender = false)
               or (m.recipientId = :userId and m.hiddenForRecipient = false)
            order by m.createdAt desc
            """)
    List<MessageEntity> findAllInvolvingUser(@Param("userId") Long userId);

    /** The thread as {@code userId} sees it: what they deleted for themselves is left out. */
    @Query("""
            select m from MessageEntity m
            where (m.senderId = :userId and m.recipientId = :otherUserId and m.hiddenForSender = false)
               or (m.senderId = :otherUserId and m.recipientId = :userId and m.hiddenForRecipient = false)
            order by m.createdAt asc
            """)
    List<MessageEntity> findThreadBetween(@Param("userId") Long userId, @Param("otherUserId") Long otherUserId);

    /** Held until the transaction ends, so forwarding and recalling the same message cannot interleave. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from MessageEntity m where m.id = :id")
    Optional<MessageEntity> findByIdForUpdate(@Param("id") Long id);

    List<MessageEntity> findAllBySenderIdAndRecipientIdAndReadFalse(Long senderId, Long recipientId);
}
