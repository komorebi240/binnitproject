package com.company.project.modules.messages.controller;

import com.company.project.common.ApiResponse;
import com.company.project.common.RateLimiter;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.storage.AttachmentDownloads;
import com.company.project.modules.messages.dto.request.BroadcastMessageRequest;
import com.company.project.modules.messages.dto.request.ForwardMessageRequest;
import com.company.project.modules.messages.dto.request.SendMessageRequest;
import com.company.project.modules.messages.dto.response.ConversationResponse;
import com.company.project.modules.messages.dto.response.MessageResponse;
import com.company.project.modules.messages.service.MessageService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/v1/messages")
public class MessageController {

    private static final int MAX_UPLOADS_PER_MINUTE = 20;

    private final MessageService messageService;
    private final RateLimiter rateLimiter;

    public MessageController(MessageService messageService, RateLimiter rateLimiter) {
        this.messageService = messageService;
        this.rateLimiter = rateLimiter;
    }

    @GetMapping("/conversations")
    public ApiResponse<List<ConversationResponse>> listConversations(
            @RequestParam(defaultValue = "false") boolean archived, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(messageService.listConversations(archived, caller));
    }

    @PutMapping("/with/{userId}/archive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable Long userId, @AuthenticationPrincipal UserPrincipal caller) {
        messageService.archiveConversation(userId, caller);
    }

    @DeleteMapping("/with/{userId}/archive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unarchive(@PathVariable Long userId, @AuthenticationPrincipal UserPrincipal caller) {
        messageService.unarchiveConversation(userId, caller);
    }

    /** Multipart: recipientUserId, optional body (caption), file. */
    @PostMapping(value = "/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MessageResponse> sendAttachment(
            @RequestParam Long recipientUserId,
            @RequestParam(required = false) String body,
            @RequestParam MultipartFile file,
            @AuthenticationPrincipal UserPrincipal caller) {
        if (!rateLimiter.tryConsume("chat-upload:" + caller.getUserId(), MAX_UPLOADS_PER_MINUTE, Duration.ofMinutes(1))) {
            throw new BusinessException(
                    "TOO_MANY_REQUESTS", "Too many uploads. Please try again shortly.", HttpStatus.TOO_MANY_REQUESTS);
        }
        return ApiResponse.success(messageService.sendAttachment(recipientUserId, body, file, caller));
    }

    /**
     * Images and videos are shown in the conversation ({@code download=false}, the default); {@code download=true} saves
     * any attachment as a file. Range requests are answered with 206, which a video player needs to seek.
     */
    @GetMapping("/attachments/{id}")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean download,
            @AuthenticationPrincipal UserPrincipal caller) {
        MessageService.AttachmentDownload file = messageService.loadAttachment(id, caller);
        boolean inline = !download && (file.image() || file.video());
        return AttachmentDownloads.respond(file.data(), file.fileName(), file.contentType(), inline);
    }

    /** Sends a copy to up to 10 colleagues; returns how many copies were sent. Shares the per-user send allowance with uploads. */
    @PostMapping("/{id}/forward")
    public ApiResponse<Integer> forward(
            @PathVariable Long id, @Valid @RequestBody ForwardMessageRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        if (!rateLimiter.tryConsume("chat-forward:" + caller.getUserId(), MAX_UPLOADS_PER_MINUTE, Duration.ofMinutes(1))) {
            throw new BusinessException(
                    "TOO_MANY_REQUESTS", "Too many messages forwarded. Please try again shortly.", HttpStatus.TOO_MANY_REQUESTS);
        }
        return ApiResponse.success(messageService.forwardMessage(id, request.recipientUserIds(), caller));
    }

    /** "Delete for me": only the caller stops seeing the message. Recall (DELETE /{id}) removes it for both. */
    @DeleteMapping("/{id}/for-me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void hide(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        messageService.hideMessage(id, caller);
    }

    /** Recall: only the sender; the message stays in the thread as a "recalled" placeholder. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void recall(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        messageService.recallMessage(id, caller);
    }

    @GetMapping("/with/{userId}")
    public ApiResponse<List<MessageResponse>> getThread(
            @PathVariable Long userId, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(messageService.getThreadWith(userId, caller));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MessageResponse> send(
            @Valid @RequestBody SendMessageRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(messageService.sendMessage(request.recipientUserId(), request.body(), caller));
    }

    /** System/broadcast accounts only - see MessageServiceImpl.broadcastMessage. */
    @PostMapping("/broadcast")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Integer> broadcast(
            @Valid @RequestBody BroadcastMessageRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(messageService.broadcastMessage(request.body(), caller));
    }
}
