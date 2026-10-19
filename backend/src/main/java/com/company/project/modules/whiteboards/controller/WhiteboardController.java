package com.company.project.modules.whiteboards.controller;

import com.company.project.common.ApiResponse;
import com.company.project.common.RateLimitGuard;
import com.company.project.modules.whiteboards.dto.request.CreateWhiteboardRequest;
import com.company.project.modules.whiteboards.dto.request.RenameWhiteboardRequest;
import com.company.project.modules.whiteboards.dto.request.SaveWhiteboardSceneRequest;
import com.company.project.modules.whiteboards.dto.request.SetWhiteboardMemberRequest;
import com.company.project.modules.whiteboards.dto.response.WhiteboardDetailResponse;
import com.company.project.modules.whiteboards.dto.response.WhiteboardMemberResponse;
import com.company.project.modules.whiteboards.dto.response.WhiteboardSummaryResponse;
import com.company.project.modules.whiteboards.dto.response.WhiteboardVersionResponse;
import com.company.project.modules.whiteboards.service.WhiteboardService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

/** Who may do what is decided in WhiteboardServiceImpl (it depends on the board, not just the caller's role). */
@RestController
@RequestMapping("/api/v1/whiteboards")
public class WhiteboardController {

    private final WhiteboardService whiteboardService;
    private final RateLimitGuard rateLimitGuard;

    public WhiteboardController(WhiteboardService whiteboardService, RateLimitGuard rateLimitGuard) {
        this.whiteboardService = whiteboardService;
        this.rateLimitGuard = rateLimitGuard;
    }

    @GetMapping
    public ApiResponse<List<WhiteboardSummaryResponse>> list(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(whiteboardService.listBoards(caller));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<WhiteboardDetailResponse> create(
            @Valid @RequestBody CreateWhiteboardRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        rateLimitGuard.enforce("whiteboard-create:" + caller.getUserId(), 30, Duration.ofHours(1));
        return ApiResponse.success(whiteboardService.createBoard(request, caller));
    }

    @GetMapping("/{id}")
    public ApiResponse<WhiteboardDetailResponse> get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(whiteboardService.getBoard(id, caller));
    }

    /** Polled every few seconds by an open board; tiny on purpose. */
    @GetMapping("/{id}/version")
    public ApiResponse<WhiteboardVersionResponse> version(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(whiteboardService.getVersion(id, caller));
    }

    @PutMapping("/{id}/scene")
    public ApiResponse<WhiteboardVersionResponse> saveScene(
            @PathVariable Long id, @Valid @RequestBody SaveWhiteboardSceneRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        // Autosave runs about once a second or two while someone draws; this leaves room for that, not for a flood.
        rateLimitGuard.enforce("whiteboard-save:" + caller.getUserId(), 120, Duration.ofMinutes(1));
        return ApiResponse.success(whiteboardService.saveScene(id, request, caller));
    }

    @PatchMapping("/{id}")
    public ApiResponse<WhiteboardSummaryResponse> rename(
            @PathVariable Long id, @Valid @RequestBody RenameWhiteboardRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(whiteboardService.renameBoard(id, request, caller));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        whiteboardService.deleteBoard(id, caller);
    }

    @PutMapping("/{id}/members/{userId}")
    public ApiResponse<List<WhiteboardMemberResponse>> setMember(
            @PathVariable Long id, @PathVariable Long userId, @Valid @RequestBody SetWhiteboardMemberRequest request,
            @AuthenticationPrincipal UserPrincipal caller) {
        rateLimitGuard.enforce("whiteboard-share:" + caller.getUserId(), 60, Duration.ofHours(1));
        return ApiResponse.success(whiteboardService.setMember(id, userId, request, caller));
    }

    @DeleteMapping("/{id}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@PathVariable Long id, @PathVariable Long userId, @AuthenticationPrincipal UserPrincipal caller) {
        whiteboardService.removeMember(id, userId, caller);
    }
}
