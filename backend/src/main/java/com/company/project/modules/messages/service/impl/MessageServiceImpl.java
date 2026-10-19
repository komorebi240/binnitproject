package com.company.project.modules.messages.service.impl;

import com.company.project.common.NotificationType;
import com.company.project.common.TransactionHooks;
import com.company.project.common.storage.AttachmentStorage;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.messages.domain.MessageArchiveEntity;
import com.company.project.modules.messages.domain.MessageAttachmentEntity;
import com.company.project.modules.messages.domain.MessageEntity;
import com.company.project.modules.messages.dto.response.AttachmentResponse;
import com.company.project.modules.messages.dto.response.ConversationResponse;
import com.company.project.modules.messages.dto.response.MessageResponse;
import com.company.project.modules.messages.repository.MessageArchiveRepository;
import com.company.project.modules.messages.repository.MessageAttachmentRepository;
import com.company.project.modules.messages.repository.MessageRepository;
import com.company.project.modules.messages.service.MessageService;
import com.company.project.modules.notifications.service.NotificationService;
import com.company.project.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 1-1 only, polling-based (no WebSocket - CLAUDE.md section 29, not needed at this scale). Every
 * method re-derives the tenant boundary from the recipient/other party's own company, never
 * trusting an id alone: messaging someone outside the caller's company reads as 404, same as
 * cross-company access elsewhere in this app (CLAUDE.md section 9/10).
 */
@Service
public class MessageServiceImpl implements MessageService {

    private static final int MAX_BODY_LENGTH = 2000;
    private static final int MAX_FORWARD_RECIPIENTS = 10;
    private static final String ATTACHMENT_NOTIFICATION_BODY = "Đã gửi một tệp đính kèm";

    private final MessageRepository messageRepository;
    private final MessageAttachmentRepository attachmentRepository;
    private final MessageArchiveRepository archiveRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AttachmentStorage attachmentStorage;

    public MessageServiceImpl(
            MessageRepository messageRepository,
            MessageAttachmentRepository attachmentRepository,
            MessageArchiveRepository archiveRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            @Qualifier("chatAttachmentStorage") AttachmentStorage attachmentStorage) {
        this.messageRepository = messageRepository;
        this.attachmentRepository = attachmentRepository;
        this.archiveRepository = archiveRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.attachmentStorage = attachmentStorage;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> listConversations(boolean archived, UserPrincipal caller) {
        List<MessageEntity> all = messageRepository.findAllInvolvingUser(caller.getUserId());

        // findAllInvolvingUser is already newest-first, so the first message seen per
        // counterpart is that conversation's latest one.
        Map<Long, MessageEntity> latestByCounterpart = new LinkedHashMap<>();
        for (MessageEntity m : all) {
            Long counterpartId = m.getSenderId().equals(caller.getUserId()) ? m.getRecipientId() : m.getSenderId();
            latestByCounterpart.putIfAbsent(counterpartId, m);
        }

        Set<Long> archivedIds = archiveRepository.findAllByUserId(caller.getUserId()).stream()
                .map(MessageArchiveEntity::getOtherUserId)
                .collect(Collectors.toSet());
        latestByCounterpart.keySet().removeIf(id -> archivedIds.contains(id) != archived);

        Map<Long, UserEntity> users = userRepository.findAllById(latestByCounterpart.keySet()).stream()
                .collect(Collectors.toMap(UserEntity::getId, Function.identity()));
        Map<Long, MessageAttachmentEntity> latestAttachments = attachmentsByMessageId(
                latestByCounterpart.values().stream().map(MessageEntity::getId).toList());

        return latestByCounterpart.entrySet().stream()
                .map(e -> {
                    Long counterpartId = e.getKey();
                    MessageEntity latest = e.getValue();
                    UserEntity other = users.get(counterpartId);
                    MessageAttachmentEntity attachment = latestAttachments.get(latest.getId());
                    long unread = messageRepository
                            .findAllBySenderIdAndRecipientIdAndReadFalse(counterpartId, caller.getUserId())
                            .size();
                    return new ConversationResponse(
                            counterpartId,
                            other == null ? null : other.getFullName(),
                            other == null ? null : avatarUrl(other),
                            other == null ? null : other.getPresenceStatus(),
                            latest.getBody(),
                            latest.isRecalled(),
                            attachment == null ? null : attachment.getOriginalName(),
                            latest.getCreatedAt(),
                            unread);
                })
                .sorted(Comparator.comparing(ConversationResponse::lastMessageAt).reversed())
                .toList();
    }

    @Override
    @Transactional
    public List<MessageResponse> getThreadWith(Long otherUserId, UserPrincipal caller) {
        requireSameCompanyUser(otherUserId, caller);

        List<MessageEntity> thread = messageRepository.findThreadBetween(caller.getUserId(), otherUserId);
        messageRepository.findAllBySenderIdAndRecipientIdAndReadFalse(otherUserId, caller.getUserId())
                .forEach(MessageEntity::markRead);

        Map<Long, MessageAttachmentEntity> attachments = attachmentsByMessageId(
                thread.stream().map(MessageEntity::getId).toList());
        return thread.stream().map(m -> toResponse(m, attachments.get(m.getId()))).toList();
    }

    @Override
    @Transactional
    public MessageResponse sendMessage(Long recipientUserId, String body, UserPrincipal caller) {
        requireValidRecipient(recipientUserId, caller);

        MessageEntity saved = messageRepository.save(new MessageEntity(caller.getUserId(), recipientUserId, body));
        unarchiveBothSides(caller.getUserId(), recipientUserId);
        notifyRecipient(recipientUserId, body, false, caller);

        return toResponse(saved, null);
    }

    @Override
    @Transactional
    public MessageResponse sendAttachment(Long recipientUserId, String body, MultipartFile file, UserPrincipal caller) {
        requireValidRecipient(recipientUserId, caller);
        String caption = body == null ? "" : body.trim();
        if (caption.length() > MAX_BODY_LENGTH) {
            throw new BusinessException(
                    "VALIDATION_ERROR", "body must be at most " + MAX_BODY_LENGTH + " characters", HttpStatus.BAD_REQUEST);
        }

        AttachmentStorage.Stored stored = attachmentStorage.store(file);
        try {
            MessageEntity message = messageRepository.save(new MessageEntity(caller.getUserId(), recipientUserId, caption));
            MessageAttachmentEntity attachment = attachmentRepository.save(new MessageAttachmentEntity(
                    message.getId(), stored.storedName(), stored.displayName(), stored.contentType(), stored.sizeBytes(),
                    stored.image(), stored.video()));
            unarchiveBothSides(caller.getUserId(), recipientUserId);
            boolean attachmentOnly = caption.isEmpty();
            notifyRecipient(recipientUserId, attachmentOnly ? ATTACHMENT_NOTIFICATION_BODY : caption, attachmentOnly, caller);
            return toResponse(message, attachment);
        } catch (RuntimeException e) {
            // Don't leave an unreferenced file on disk when the DB write failed.
            attachmentStorage.delete(stored.storedName());
            throw e;
        }
    }

    @Override
    @Transactional
    public void recallMessage(Long messageId, UserPrincipal caller) {
        // Someone else's message reads as 404, not 403 - don't confirm that the id exists.
        MessageEntity message = messageRepository.findById(messageId)
                .filter(m -> m.getSenderId().equals(caller.getUserId()))
                .orElseThrow(() -> new ResourceNotFoundException("Message", messageId));
        if (message.isRecalled()) {
            return;
        }

        List<MessageAttachmentEntity> attachments = attachmentRepository.findAllByMessageId(messageId);
        message.recall();
        attachmentRepository.deleteAll(attachments);
        // A forwarded copy shares the file: it goes only when no other message uses it any more.
        List<String> unusedFiles = attachments.stream()
                .map(MessageAttachmentEntity::getStoredName)
                .distinct()
                .filter(storedName -> !attachmentRepository.existsByStoredName(storedName))
                .toList();
        // Only once the DB change is durable: a rolled-back recall must keep its files.
        TransactionHooks.afterCommit(() -> unusedFiles.forEach(attachmentStorage::delete));
    }

    @Override
    @Transactional
    public int forwardMessage(Long messageId, List<Long> recipientUserIds, UserPrincipal caller) {
        List<Long> recipients = recipientUserIds.stream().distinct().toList();
        if (recipients.isEmpty() || recipients.size() > MAX_FORWARD_RECIPIENTS) {
            throw new BusinessException(
                    "VALIDATION_ERROR", "Choose between 1 and " + MAX_FORWARD_RECIPIENTS + " people", HttpStatus.BAD_REQUEST);
        }
        // Locked so a recall of the original cannot slip in between the check below and the copies sharing its file.
        MessageEntity original = messageRepository.findByIdForUpdate(messageId)
                .filter(m -> m.isParticipant(caller.getUserId()) && !m.isHiddenFor(caller.getUserId()))
                .orElseThrow(() -> new ResourceNotFoundException("Message", messageId));
        if (original.isRecalled()) {
            throw new BusinessException(
                    "MESSAGE_RECALLED", "A recalled message cannot be forwarded", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        // Every recipient is checked before anything is written: all or none.
        recipients.forEach(recipientId -> requireValidRecipient(recipientId, caller));

        MessageAttachmentEntity attachment = attachmentRepository.findAllByMessageId(messageId).stream().findFirst().orElse(null);
        boolean attachmentOnly = original.getBody().isEmpty() && attachment != null;
        for (Long recipientId : recipients) {
            MessageEntity copy = messageRepository.save(
                    MessageEntity.forwardedCopy(caller.getUserId(), recipientId, original.getBody()));
            if (attachment != null) {
                attachmentRepository.save(attachment.copyFor(copy.getId()));
            }
            unarchiveBothSides(caller.getUserId(), recipientId);
            notifyRecipient(recipientId, attachmentOnly ? ATTACHMENT_NOTIFICATION_BODY : original.getBody(), attachmentOnly, caller);
        }
        return recipients.size();
    }

    @Override
    @Transactional
    public void hideMessage(Long messageId, UserPrincipal caller) {
        MessageEntity message = messageRepository.findById(messageId)
                .filter(m -> m.isParticipant(caller.getUserId()))
                .orElseThrow(() -> new ResourceNotFoundException("Message", messageId));
        message.hideFor(caller.getUserId());
    }

    @Override
    @Transactional
    public void archiveConversation(Long otherUserId, UserPrincipal caller) {
        requireSameCompanyUser(otherUserId, caller);
        if (!archiveRepository.existsByUserIdAndOtherUserId(caller.getUserId(), otherUserId)) {
            archiveRepository.save(new MessageArchiveEntity(caller.getUserId(), otherUserId));
        }
    }

    @Override
    @Transactional
    public void unarchiveConversation(Long otherUserId, UserPrincipal caller) {
        requireSameCompanyUser(otherUserId, caller);
        archiveRepository.deleteByPair(caller.getUserId(), otherUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public AttachmentDownload loadAttachment(Long attachmentId, UserPrincipal caller) {
        MessageAttachmentEntity attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", attachmentId));
        messageRepository.findById(attachment.getMessageId())
                .filter(m -> !m.isRecalled())
                .filter(m -> m.isParticipant(caller.getUserId()) && !m.isHiddenFor(caller.getUserId()))
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", attachmentId));

        AttachmentStorage.Resolved file = attachmentStorage.load(attachment.getStoredName());
        return new AttachmentDownload(
                file.resource(), attachment.getOriginalName(), attachment.getContentType(), attachment.isImage(), attachment.isVideo());
    }

    /**
     * The one deliberate exception to "cross-company is always 404": a flagged system/broadcast
     * account (see UserEntity.isSystemAccount) can message, and be messaged back by, anyone in
     * any company - otherwise a recipient couldn't even view the thread the bot just wrote to
     * them in. Every other pair of users still hits the normal same-company boundary.
     */
    @Override
    @Transactional
    public int broadcastMessage(String body, UserPrincipal caller) {
        if (!caller.isSystemAccount()) {
            throw new AccessDeniedException("Only a system/broadcast account can send a broadcast message");
        }

        List<UserEntity> recipients = userRepository.findAllActive().stream()
                .filter(u -> !u.getId().equals(caller.getUserId()))
                .toList();

        for (UserEntity recipient : recipients) {
            messageRepository.save(new MessageEntity(caller.getUserId(), recipient.getId(), body));
            notifyRecipient(recipient.getId(), body, false, caller);
        }
        archiveRepository.deleteAllByOtherUser(caller.getUserId());

        return recipients.size();
    }

    private void requireValidRecipient(Long recipientUserId, UserPrincipal caller) {
        if (recipientUserId.equals(caller.getUserId())) {
            throw new BusinessException("CANNOT_MESSAGE_SELF", "You cannot send a message to yourself", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        requireSameCompanyUser(recipientUserId, caller);
    }

    /** A new message in an archived thread must not stay hidden, for either party. */
    private void unarchiveBothSides(Long senderId, Long recipientId) {
        archiveRepository.deleteByPair(recipientId, senderId);
        archiveRepository.deleteByPair(senderId, recipientId);
    }

    /** {@code attachmentOnly}: the preview is our placeholder, not the sender's words, so a client words it itself. */
    private void notifyRecipient(Long recipientUserId, String preview, boolean attachmentOnly, UserPrincipal caller) {
        Map<String, String> params = attachmentOnly
                ? Map.of("actor", caller.getUsername(), "attachmentOnly", "true")
                : Map.of("actor", caller.getUsername());
        notificationService.notify(
                recipientUserId,
                NotificationType.MESSAGE_RECEIVED,
                "Tin nhắn mới từ " + caller.getUsername(),
                preview,
                params,
                "MESSAGE_THREAD",
                caller.getUserId());
    }

    private Map<Long, MessageAttachmentEntity> attachmentsByMessageId(List<Long> messageIds) {
        if (messageIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return attachmentRepository.findAllByMessageIdIn(messageIds).stream()
                .collect(Collectors.toMap(MessageAttachmentEntity::getMessageId, Function.identity(), (a, b) -> a));
    }

    private MessageResponse toResponse(MessageEntity m, MessageAttachmentEntity attachment) {
        AttachmentResponse attachmentResponse = attachment == null
                ? null
                : new AttachmentResponse(
                        attachment.getId(), attachment.getOriginalName(), attachment.getContentType(),
                        attachment.getSizeBytes(), attachment.isImage(), attachment.isVideo());
        return new MessageResponse(
                m.getId(), m.getSenderId(), m.getRecipientId(), m.getBody(), m.isRead(), m.getCreatedAt(),
                m.isRecalled(), m.isForwarded(), attachmentResponse);
    }

    private String avatarUrl(UserEntity user) {
        return user.getAvatarPath() == null ? null : "/users/" + user.getId() + "/avatar";
    }

    private void requireSameCompanyUser(Long otherUserId, UserPrincipal caller) {
        UserEntity other = userRepository.findActiveById(otherUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", otherUserId));
        if (caller.isSystemAccount() || other.isSystemAccount()) {
            return;
        }
        if (!other.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("User", otherUserId);
        }
    }
}
