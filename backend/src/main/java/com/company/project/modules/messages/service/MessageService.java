package com.company.project.modules.messages.service;

import com.company.project.modules.messages.dto.response.ConversationResponse;
import com.company.project.modules.messages.dto.response.MessageResponse;
import com.company.project.security.UserPrincipal;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;

public interface MessageService {

    /** {@code archived} selects the caller's archived conversations instead of the active ones. */
    List<ConversationResponse> listConversations(boolean archived, UserPrincipal caller);

    /** Also marks the caller's unread incoming messages in this thread as read. */
    List<MessageResponse> getThreadWith(Long otherUserId, UserPrincipal caller);

    MessageResponse sendMessage(Long recipientUserId, String body, UserPrincipal caller);

    /** One file plus an optional caption; validated and stored server-side (see ChatAttachmentStorageService). */
    MessageResponse sendAttachment(Long recipientUserId, String body, MultipartFile file, UserPrincipal caller);

    /** Only the sender may recall; the content and any attachment are destroyed. Idempotent. */
    void recallMessage(Long messageId, UserPrincipal caller);

    /** Hides the caller's side of the conversation; a new incoming message brings it back. */
    void archiveConversation(Long otherUserId, UserPrincipal caller);

    void unarchiveConversation(Long otherUserId, UserPrincipal caller);

    /** Readable only by the message's sender or recipient; anyone else gets a 404. */
    AttachmentDownload loadAttachment(Long attachmentId, UserPrincipal caller);

    /** System/broadcast accounts only (UserEntity.isSystemAccount) - sends the same message to
     * every active user in the system, across every company. Throws AccessDeniedException for
     * anyone else. Returns how many recipients the message went to. */
    int broadcastMessage(String body, UserPrincipal caller);

    record AttachmentDownload(InputStream data, long sizeBytes, String fileName, String contentType, boolean image) {
    }
}
