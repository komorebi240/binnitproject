package com.company.project.modules.drive.controller;

import com.company.project.common.ApiResponse;
import com.company.project.modules.drive.dto.response.DriveConnectionStatusResponse;
import com.company.project.modules.drive.service.DriveConnectionService;
import com.company.project.security.UserPrincipal;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * OAuth is a full-page browser redirect flow, not a JSON API — /connect and /oauth2/callback
 * both issue HTTP redirects rather than returning ApiResponse bodies. /oauth2/callback is
 * permitAll in SecurityConfig and resolves the user from the state row it looks up, not from
 * the caller's own auth — Google's redirect must succeed even if the session cookie had any
 * hiccup during the round trip (CLAUDE.md section 13, OAuth CSRF handled via state instead).
 */
@RestController
@RequestMapping("/api/v1/drive")
public class DriveConnectionController {

    private final DriveConnectionService driveConnectionService;

    public DriveConnectionController(DriveConnectionService driveConnectionService) {
        this.driveConnectionService = driveConnectionService;
    }

    @GetMapping("/connect")
    public void connect(@AuthenticationPrincipal UserPrincipal caller, HttpServletResponse response) throws IOException {
        response.sendRedirect(driveConnectionService.buildAuthorizationUrl(caller));
    }

    @GetMapping("/oauth2/callback")
    public void callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpServletResponse response
    ) throws IOException {
        response.sendRedirect(driveConnectionService.handleCallback(code, state, error));
    }

    @GetMapping("/status")
    public ApiResponse<DriveConnectionStatusResponse> status(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(driveConnectionService.getStatus(caller));
    }
}
