package com.company.project.unit.modules.messages;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.storage.AttachmentStorage;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.messages.domain.MessageArchiveEntity;
import com.company.project.modules.messages.domain.MessageAttachmentEntity;
import com.company.project.modules.messages.domain.MessageEntity;
import com.company.project.modules.messages.repository.MessageArchiveRepository;
import com.company.project.modules.messages.repository.MessageAttachmentRepository;
import com.company.project.modules.messages.repository.MessageRepository;
import com.company.project.modules.messages.service.impl.MessageServiceImpl;
import com.company.project.modules.notifications.service.NotificationService;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Covers the Phase 7 messaging tenant-isolation rules (TC-73/TC-74) and the no-self-DM guard. */
@ExtendWith(MockitoExtension.class)
class MessageServiceImplTest {

    private static final Long COMPANY_A = 1L;

    @Mock
    private MessageRepository messageRepository;
    @Mock
    private MessageAttachmentRepository attachmentRepository;
    @Mock
    private MessageArchiveRepository archiveRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private AttachmentStorage attachmentStorage;

    private MessageServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MessageServiceImpl(
                messageRepository, attachmentRepository, archiveRepository, userRepository, notificationService, attachmentStorage);
    }

    private UserPrincipal principal(Long userId) {
        return new UserPrincipal(userId, "caller", null, COMPANY_A, AuthorityLevel.EMPLOYEE, null, null, true);
    }

    private UserPrincipal systemAccountPrincipal(Long userId) {
        return new UserPrincipal(userId, "bot", null, COMPANY_A, AuthorityLevel.EXECUTIVE, null, null, true, true);
    }

    @Test
    void sendMessage_crossCompanyRecipientIsNotFound() {
        UserPrincipal caller = principal(1L);
        UserEntity otherCompanyUser = new UserEntity(999L, "other", "hash", "Other Company User", null);
        setId(otherCompanyUser, 2L);
        when(userRepository.findActiveById(2L)).thenReturn(Optional.of(otherCompanyUser));

        assertThatThrownBy(() -> service.sendMessage(2L, "hi", caller))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void sendMessage_cannotMessageSelf() {
        UserPrincipal caller = principal(1L);

        assertThatThrownBy(() -> service.sendMessage(1L, "hi", caller))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void sendMessage_sameCompanyRecipientSucceedsAndNotifies() {
        UserPrincipal caller = principal(1L);
        UserEntity recipient = new UserEntity(COMPANY_A, "colleague", "hash", "Colleague", null);
        setId(recipient, 2L);
        when(userRepository.findActiveById(2L)).thenReturn(Optional.of(recipient));
        when(messageRepository.save(any())).thenAnswer(inv -> {
            var m = inv.getArgument(0, com.company.project.modules.messages.domain.MessageEntity.class);
            setId(m, 50L);
            return m;
        });

        var response = service.sendMessage(2L, "hello", caller);

        assertThat(response.recipientId()).isEqualTo(2L);
        verify(notificationService).notify(
                org.mockito.ArgumentMatchers.eq(2L), any(), any(), any(), argThat(params -> params.containsKey("actor")), any(), any());
    }

    @Test
    void getThreadWith_crossCompanyUserIsNotFound() {
        UserPrincipal caller = principal(1L);
        UserEntity otherCompanyUser = new UserEntity(999L, "other", "hash", "Other Company User", null);
        setId(otherCompanyUser, 2L);
        when(userRepository.findActiveById(2L)).thenReturn(Optional.of(otherCompanyUser));

        assertThatThrownBy(() -> service.getThreadWith(2L, caller))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void sendMessage_systemAccountCanMessageAcrossCompanies() {
        UserPrincipal bot = systemAccountPrincipal(99L);
        UserEntity otherCompanyUser = new UserEntity(999L, "other", "hash", "Other Company User", null);
        setId(otherCompanyUser, 2L);
        when(userRepository.findActiveById(2L)).thenReturn(Optional.of(otherCompanyUser));
        when(messageRepository.save(any())).thenAnswer(inv -> {
            var m = inv.getArgument(0, com.company.project.modules.messages.domain.MessageEntity.class);
            setId(m, 51L);
            return m;
        });

        var response = service.sendMessage(2L, "broadcast-ish", bot);

        assertThat(response.recipientId()).isEqualTo(2L);
    }

    @Test
    void getThreadWith_regularUserCanViewThreadWithASystemAccountAcrossCompanies() {
        UserPrincipal caller = principal(1L);
        UserEntity bot = new UserEntity(999L, "bot", "hash", "Thông báo nội bộ", null);
        setId(bot, 99L);
        bot.markAsSystemAccount();
        when(userRepository.findActiveById(99L)).thenReturn(Optional.of(bot));
        when(messageRepository.findThreadBetween(1L, 99L)).thenReturn(List.of());
        when(messageRepository.findAllBySenderIdAndRecipientIdAndReadFalse(99L, 1L)).thenReturn(List.of());

        var thread = service.getThreadWith(99L, caller);

        assertThat(thread).isEmpty(); // doesn't throw ResourceNotFoundException despite different companies
    }

    @Test
    void broadcastMessage_onlyASystemAccountMaySend() {
        UserPrincipal regularUser = principal(1L);

        assertThatThrownBy(() -> service.broadcastMessage("hi everyone", regularUser))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void broadcastMessage_sendsToEveryActiveUserExceptItself() {
        UserPrincipal bot = systemAccountPrincipal(99L);
        UserEntity u1 = new UserEntity(COMPANY_A, "a", "hash", "A", null);
        setId(u1, 1L);
        UserEntity u2 = new UserEntity(999L, "b", "hash", "B", null);
        setId(u2, 2L);
        UserEntity self = new UserEntity(COMPANY_A, "bot", "hash", "Bot", null);
        setId(self, 99L);
        when(userRepository.findAllActive()).thenReturn(List.of(u1, u2, self));

        int sentTo = service.broadcastMessage("hi everyone", bot);

        assertThat(sentTo).isEqualTo(2);
        verify(messageRepository, times(2)).save(any());
        verify(notificationService, times(2)).notify(any(), any(), any(), any(), any(), any(), any());
    }

    private MessageEntity messageFrom(Long id, Long senderId, Long recipientId, String body) {
        MessageEntity m = new MessageEntity(senderId, recipientId, body);
        setId(m, id);
        return m;
    }

    private MessageAttachmentEntity attachmentOf(Long id, Long messageId) {
        MessageAttachmentEntity a = new MessageAttachmentEntity(messageId, "stored.png", "pic.png", "image/png", 10L, true, false);
        setId(a, id);
        return a;
    }

    @Test
    void recallMessage_onlySenderMay_otherwiseNotFound() {
        when(messageRepository.findById(5L)).thenReturn(Optional.of(messageFrom(5L, 1L, 2L, "secret")));

        assertThatThrownBy(() -> service.recallMessage(5L, principal(2L)))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(attachmentStorage, never()).delete(any());
    }

    @Test
    void recallMessage_blanksBodyAndDestroysAttachmentFiles() {
        MessageEntity message = messageFrom(5L, 1L, 2L, "secret");
        when(messageRepository.findById(5L)).thenReturn(Optional.of(message));
        when(attachmentRepository.findAllByMessageId(5L)).thenReturn(List.of(attachmentOf(7L, 5L)));

        service.recallMessage(5L, principal(1L));

        assertThat(message.isRecalled()).isTrue();
        assertThat(message.getBody()).isEmpty();
        verify(attachmentStorage).delete("stored.png");
        verify(attachmentRepository).deleteAll(any());
    }

    @Test
    void recallMessage_keepsAFileThatAForwardedCopyStillUses() {
        MessageEntity message = messageFrom(5L, 1L, 2L, "secret");
        when(messageRepository.findById(5L)).thenReturn(Optional.of(message));
        when(attachmentRepository.findAllByMessageId(5L)).thenReturn(List.of(attachmentOf(7L, 5L)));
        when(attachmentRepository.existsByStoredName("stored.png")).thenReturn(true);

        service.recallMessage(5L, principal(1L));

        assertThat(message.isRecalled()).isTrue();
        verify(attachmentRepository).deleteAll(any());
        verify(attachmentStorage, never()).delete(any());
    }

    // ---- forward (Phase 41)

    private void colleagues(Long... ids) {
        for (Long id : ids) {
            UserEntity user = new UserEntity(COMPANY_A, "user" + id, "hash", "User " + id, null);
            setId(user, id);
            when(userRepository.findActiveById(id)).thenReturn(Optional.of(user));
        }
    }

    private void savesGetIds() {
        long[] next = {100L};
        when(messageRepository.save(any())).thenAnswer(inv -> {
            MessageEntity m = inv.getArgument(0);
            setId(m, next[0]++);
            return m;
        });
    }

    @Test
    void forwardMessage_sendsAForwardedCopyToEachRecipientSharingTheFile() {
        MessageEntity original = messageFrom(5L, 2L, 1L, "see this");
        when(messageRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(original));
        when(attachmentRepository.findAllByMessageId(5L)).thenReturn(List.of(attachmentOf(7L, 5L)));
        colleagues(3L, 4L);
        savesGetIds();

        int sent = service.forwardMessage(5L, List.of(3L, 4L, 3L), principal(1L));

        assertThat(sent).as("duplicates are sent once").isEqualTo(2);
        org.mockito.ArgumentCaptor<MessageEntity> copies = org.mockito.ArgumentCaptor.forClass(MessageEntity.class);
        verify(messageRepository, times(2)).save(copies.capture());
        assertThat(copies.getAllValues()).allSatisfy(copy -> {
            assertThat(copy.isForwarded()).isTrue();
            assertThat(copy.getSenderId()).isEqualTo(1L);
            assertThat(copy.getBody()).isEqualTo("see this");
        });
        assertThat(copies.getAllValues()).extracting(MessageEntity::getRecipientId).containsExactly(3L, 4L);
        org.mockito.ArgumentCaptor<MessageAttachmentEntity> files = org.mockito.ArgumentCaptor.forClass(MessageAttachmentEntity.class);
        verify(attachmentRepository, times(2)).save(files.capture());
        assertThat(files.getAllValues()).extracting(MessageAttachmentEntity::getStoredName).containsOnly("stored.png");
        verify(attachmentStorage, never()).store(any());
        verify(notificationService, times(2)).notify(any(), any(), any(), any(), any(), any(), any());
        verify(archiveRepository).deleteByPair(3L, 1L);
        verify(archiveRepository).deleteByPair(4L, 1L);
    }

    @Test
    void forwardMessage_aRecalledMessageCannotBeForwarded() {
        MessageEntity original = messageFrom(5L, 2L, 1L, "gone");
        original.recall();
        when(messageRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(original));

        assertThatThrownBy(() -> service.forwardMessage(5L, List.of(3L), principal(1L)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("recalled");
        verify(messageRepository, never()).save(any());
    }

    @Test
    void forwardMessage_someoneElsesMessageIsNotFound() {
        when(messageRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(messageFrom(5L, 2L, 3L, "private")));

        assertThatThrownBy(() -> service.forwardMessage(5L, List.of(4L), principal(1L)))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(messageRepository, never()).save(any());
    }

    @Test
    void forwardMessage_aMessageTheCallerDeletedForThemselvesIsNotFound() {
        MessageEntity original = messageFrom(5L, 2L, 1L, "hidden");
        original.hideFor(1L);
        when(messageRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(original));

        assertThatThrownBy(() -> service.forwardMessage(5L, List.of(3L), principal(1L)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void forwardMessage_oneRecipientInAnotherCompanyStopsTheWholeForward() {
        when(messageRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(messageFrom(5L, 2L, 1L, "hi")));
        colleagues(3L);
        UserEntity outsider = new UserEntity(999L, "outsider", "hash", "Outsider", null);
        setId(outsider, 9L);
        when(userRepository.findActiveById(9L)).thenReturn(Optional.of(outsider));

        assertThatThrownBy(() -> service.forwardMessage(5L, List.of(3L, 9L), principal(1L)))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(messageRepository, never()).save(any());
        verify(notificationService, never()).notify(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void forwardMessage_atMostTenPeopleAndNeverToOneself() {
        List<Long> eleven = java.util.stream.LongStream.rangeClosed(10, 20).boxed().toList();

        assertThatThrownBy(() -> service.forwardMessage(5L, eleven, principal(1L))).isInstanceOf(BusinessException.class);

        when(messageRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(messageFrom(5L, 2L, 1L, "hi")));
        assertThatThrownBy(() -> service.forwardMessage(5L, List.of(1L), principal(1L)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("yourself");
    }

    // ---- delete for me (Phase 41)

    @Test
    void hideMessage_hidesOnlyForTheCaller() {
        MessageEntity message = messageFrom(5L, 1L, 2L, "hello");
        when(messageRepository.findById(5L)).thenReturn(Optional.of(message));

        service.hideMessage(5L, principal(2L));

        assertThat(message.isHiddenFor(2L)).isTrue();
        assertThat(message.isHiddenFor(1L)).as("the sender still sees it").isFalse();
        assertThat(message.isRead()).as("a hidden incoming message no longer counts as unread").isTrue();
        assertThat(message.isRecalled()).isFalse();
    }

    @Test
    void hideMessage_theSenderCanHideTheirOwnToo() {
        MessageEntity message = messageFrom(5L, 1L, 2L, "hello");
        when(messageRepository.findById(5L)).thenReturn(Optional.of(message));

        service.hideMessage(5L, principal(1L));

        assertThat(message.isHiddenFor(1L)).isTrue();
        assertThat(message.isHiddenFor(2L)).isFalse();
        assertThat(message.isRead()).as("the recipient has not read it").isFalse();
    }

    @Test
    void hideMessage_someoneElsesMessageIsNotFound() {
        when(messageRepository.findById(5L)).thenReturn(Optional.of(messageFrom(5L, 1L, 2L, "hello")));

        assertThatThrownBy(() -> service.hideMessage(5L, principal(3L))).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void loadAttachment_notAfterTheCallerDeletedTheMessageForThemselves() {
        MessageEntity message = messageFrom(5L, 1L, 2L, "");
        message.hideFor(2L);
        when(attachmentRepository.findById(7L)).thenReturn(Optional.of(attachmentOf(7L, 5L)));
        when(messageRepository.findById(5L)).thenReturn(Optional.of(message));

        assertThatThrownBy(() -> service.loadAttachment(7L, principal(2L))).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void recallMessage_inTransactionDeletesFilesOnlyAfterCommit() {
        MessageEntity message = messageFrom(5L, 1L, 2L, "secret");
        when(messageRepository.findById(5L)).thenReturn(Optional.of(message));
        when(attachmentRepository.findAllByMessageId(5L)).thenReturn(List.of(attachmentOf(7L, 5L)));

        TransactionSynchronizationManager.initSynchronization();
        try {
            service.recallMessage(5L, principal(1L));
            verify(attachmentStorage, never()).delete(any());

            TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
            verify(attachmentStorage).delete("stored.png");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void recallMessage_rolledBackTransactionKeepsTheFiles() {
        MessageEntity message = messageFrom(5L, 1L, 2L, "secret");
        when(messageRepository.findById(5L)).thenReturn(Optional.of(message));
        when(attachmentRepository.findAllByMessageId(5L)).thenReturn(List.of(attachmentOf(7L, 5L)));

        TransactionSynchronizationManager.initSynchronization();
        try {
            service.recallMessage(5L, principal(1L));

            // A rollback only fires afterCompletion(STATUS_ROLLED_BACK), never afterCommit.
            TransactionSynchronizationManager.getSynchronizations()
                    .forEach(sync -> sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
            verify(attachmentStorage, never()).delete(any());
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void recallMessage_alreadyRecalledIsIdempotent() {
        MessageEntity message = messageFrom(5L, 1L, 2L, "secret");
        message.recall();
        when(messageRepository.findById(5L)).thenReturn(Optional.of(message));

        service.recallMessage(5L, principal(1L));

        verify(attachmentRepository, never()).findAllByMessageId(any());
    }

    @Test
    void loadAttachment_thirdPartyIsNotFound() {
        when(attachmentRepository.findById(7L)).thenReturn(Optional.of(attachmentOf(7L, 5L)));
        when(messageRepository.findById(5L)).thenReturn(Optional.of(messageFrom(5L, 1L, 2L, "")));

        assertThatThrownBy(() -> service.loadAttachment(7L, principal(3L)))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(attachmentStorage, never()).load(any());
    }

    @Test
    void loadAttachment_recipientCanDownload() {
        when(attachmentRepository.findById(7L)).thenReturn(Optional.of(attachmentOf(7L, 5L)));
        when(messageRepository.findById(5L)).thenReturn(Optional.of(messageFrom(5L, 1L, 2L, "")));
        when(attachmentStorage.load("stored.png"))
                .thenReturn(new AttachmentStorage.Resolved(new org.springframework.core.io.ByteArrayResource(new byte[10]), 10L));

        var download = service.loadAttachment(7L, principal(2L));

        assertThat(download.fileName()).isEqualTo("pic.png");
        assertThat(download.image()).isTrue();
    }

    @Test
    void loadAttachment_recalledMessageIsNotFound() {
        MessageEntity message = messageFrom(5L, 1L, 2L, "");
        message.recall();
        when(attachmentRepository.findById(7L)).thenReturn(Optional.of(attachmentOf(7L, 5L)));
        when(messageRepository.findById(5L)).thenReturn(Optional.of(message));

        assertThatThrownBy(() -> service.loadAttachment(7L, principal(2L)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void listConversations_splitsActiveAndArchived() {
        UserPrincipal caller = principal(1L);
        when(messageRepository.findAllInvolvingUser(1L)).thenReturn(List.of(
                messageFrom(11L, 2L, 1L, "from two"), messageFrom(10L, 3L, 1L, "from three")));
        when(archiveRepository.findAllByUserId(1L)).thenReturn(List.of(new MessageArchiveEntity(1L, 3L)));
        UserEntity two = new UserEntity(COMPANY_A, "two", "hash", "Two", null);
        setId(two, 2L);
        UserEntity three = new UserEntity(COMPANY_A, "three", "hash", "Three", null);
        setId(three, 3L);
        when(userRepository.findAllById(any())).thenAnswer(inv -> {
            java.util.Collection<Long> ids = inv.getArgument(0);
            return java.util.stream.Stream.of(two, three).filter(u -> ids.contains(u.getId())).toList();
        });

        assertThat(service.listConversations(false, caller)).extracting("otherUserId").containsExactly(2L);
        assertThat(service.listConversations(true, caller)).extracting("otherUserId").containsExactly(3L);
    }

    @Test
    void archiveConversation_isIdempotent() {
        UserEntity colleague = new UserEntity(COMPANY_A, "c", "hash", "C", null);
        setId(colleague, 2L);
        when(userRepository.findActiveById(2L)).thenReturn(Optional.of(colleague));
        when(archiveRepository.existsByUserIdAndOtherUserId(1L, 2L)).thenReturn(true);

        service.archiveConversation(2L, principal(1L));

        verify(archiveRepository, never()).save(any());
    }

    @Test
    void sendMessage_bringsArchivedThreadBackForBothSides() {
        UserEntity recipient = new UserEntity(COMPANY_A, "c", "hash", "C", null);
        setId(recipient, 2L);
        when(userRepository.findActiveById(2L)).thenReturn(Optional.of(recipient));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.sendMessage(2L, "hi", principal(1L));

        verify(archiveRepository).deleteByPair(2L, 1L);
        verify(archiveRepository).deleteByPair(1L, 2L);
    }

    private static void setId(Object entity, Long id) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
