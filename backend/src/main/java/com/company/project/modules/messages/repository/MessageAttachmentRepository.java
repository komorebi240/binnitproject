package com.company.project.modules.messages.repository;

import com.company.project.modules.messages.domain.MessageAttachmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface MessageAttachmentRepository extends JpaRepository<MessageAttachmentEntity, Long> {

    List<MessageAttachmentEntity> findAllByMessageIdIn(Collection<Long> messageIds);

    List<MessageAttachmentEntity> findAllByMessageId(Long messageId);

    /** Whether any attachment still uses this file (forwarded copies share it). */
    boolean existsByStoredName(String storedName);
}
