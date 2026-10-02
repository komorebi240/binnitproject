package com.company.project.modules.notifications.controller;

import com.company.project.common.ApiResponse;
import com.company.project.modules.notifications.dto.response.NotificationResponse;
import com.company.project.modules.notifications.service.NotificationService;
import com.company.project.security.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ApiResponse<List<NotificationResponse>> list(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(notificationService.listMine(caller));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> unreadCount(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(Map.of("count", notificationService.countUnread(caller)));
    }

    @PatchMapping("/{id}/read")
    public ApiResponse<Void> markRead(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        notificationService.markRead(id, caller);
        return ApiResponse.success(null);
    }

    @PatchMapping("/read-all")
    public ApiResponse<Void> markAllRead(@AuthenticationPrincipal UserPrincipal caller) {
        notificationService.markAllRead(caller);
        return ApiResponse.success(null);
    }
}
