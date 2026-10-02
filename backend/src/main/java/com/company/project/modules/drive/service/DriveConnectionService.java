package com.company.project.modules.drive.service;

import com.company.project.modules.drive.dto.response.DriveConnectionStatusResponse;
import com.company.project.security.UserPrincipal;

public interface DriveConnectionService {

    String buildAuthorizationUrl(UserPrincipal caller);

    /** Returns the URL to redirect the browser to (frontend success/error page). {@code code}
     * is null when Google reports an error (e.g. the user declined consent). */
    String handleCallback(String code, String state, String error);

    DriveConnectionStatusResponse getStatus(UserPrincipal caller);

    /** Fresh access token for {@code userId}, obtained by refreshing right before use - see
     * the Phase 3 plan for why we don't cache access tokens. Throws if not connected. */
    String getValidAccessToken(Long userId);

    /** The Google account email connected for {@code userId}. Throws if not connected. */
    String getConnectedEmail(Long userId);
}
