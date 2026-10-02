package com.company.project.modules.drive.service.impl;

import com.company.project.common.exception.BusinessException;
import com.company.project.modules.drive.domain.GoogleDriveConnectionEntity;
import com.company.project.modules.drive.domain.OAuthStateEntity;
import com.company.project.modules.drive.dto.response.DriveConnectionStatusResponse;
import com.company.project.modules.drive.repository.GoogleDriveConnectionRepository;
import com.company.project.modules.drive.repository.OAuthStateRepository;
import com.company.project.modules.drive.service.DriveConnectionService;
import com.company.project.modules.drive.service.GoogleDriveClient;
import com.company.project.modules.drive.service.GoogleTokenResponse;
import com.company.project.security.TokenEncryptionService;
import com.company.project.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class DriveConnectionServiceImpl implements DriveConnectionService {

    private static final Logger log = LoggerFactory.getLogger(DriveConnectionServiceImpl.class);
    private static final Duration STATE_TTL = Duration.ofMinutes(10);

    private final GoogleDriveClient googleDriveClient;
    private final GoogleDriveConnectionRepository connectionRepository;
    private final OAuthStateRepository oauthStateRepository;
    private final TokenEncryptionService tokenEncryptionService;
    private final String frontendBaseUrl;

    public DriveConnectionServiceImpl(
            GoogleDriveClient googleDriveClient,
            GoogleDriveConnectionRepository connectionRepository,
            OAuthStateRepository oauthStateRepository,
            TokenEncryptionService tokenEncryptionService,
            @Value("${app.frontend-url}") String frontendBaseUrl
    ) {
        this.googleDriveClient = googleDriveClient;
        this.connectionRepository = connectionRepository;
        this.oauthStateRepository = oauthStateRepository;
        this.tokenEncryptionService = tokenEncryptionService;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Override
    @Transactional
    public String buildAuthorizationUrl(UserPrincipal caller) {
        String state = UUID.randomUUID().toString();
        oauthStateRepository.save(new OAuthStateEntity(state, caller.getUserId()));
        return googleDriveClient.buildAuthorizationUrl(state);
    }

    @Override
    @Transactional
    public String handleCallback(String code, String state, String error) {
        try {
            OAuthStateEntity stateEntity = state != null ? oauthStateRepository.findById(state).orElse(null) : null;
            if (state != null) {
                // Always delete on first use, valid or not - a state token is single-use
                // regardless (CLAUDE.md section 13, OAuth CSRF: replaying an old state must
                // never succeed).
                oauthStateRepository.deleteById(state);
            }

            if (error != null) {
                return frontendUrl("error", error);
            }
            if (stateEntity == null || Duration.between(stateEntity.getCreatedAt(), Instant.now()).compareTo(STATE_TTL) > 0) {
                return frontendUrl("error", "expired_or_invalid_state");
            }
            if (code == null) {
                return frontendUrl("error", "missing_code");
            }

            GoogleTokenResponse tokenResponse = googleDriveClient.exchangeAuthorizationCode(code);
            if (tokenResponse.refreshToken() == null) {
                // Google omits refresh_token when the user has already granted consent before
                // and we didn't force prompt=consent - we always send prompt=consent, so this
                // should not normally happen, but fail loudly instead of storing an unusable connection.
                return frontendUrl("error", "no_refresh_token");
            }

            String email = googleDriveClient.fetchAccountEmail(tokenResponse.accessToken());
            String encryptedRefreshToken = tokenEncryptionService.encrypt(tokenResponse.refreshToken());

            connectionRepository.findActiveByUserId(stateEntity.getUserId())
                    .ifPresentOrElse(
                            existing -> existing.updateToken(email, encryptedRefreshToken),
                            () -> connectionRepository.save(new GoogleDriveConnectionEntity(
                                    stateEntity.getUserId(), email, encryptedRefreshToken)));

            return frontendUrl("drive", "connected");
        } catch (Exception e) {
            log.warn("Google Drive OAuth callback failed", e);
            return frontendUrl("error", "connection_failed");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public DriveConnectionStatusResponse getStatus(UserPrincipal caller) {
        return connectionRepository.findActiveByUserId(caller.getUserId())
                .map(c -> new DriveConnectionStatusResponse(true, c.getGoogleEmail()))
                .orElseGet(() -> new DriveConnectionStatusResponse(false, null));
    }

    @Override
    @Transactional(readOnly = true)
    public String getValidAccessToken(Long userId) {
        GoogleDriveConnectionEntity connection = requireConnection(userId);
        String refreshToken = tokenEncryptionService.decrypt(connection.getRefreshTokenEncrypted());
        return googleDriveClient.refreshAccessToken(refreshToken);
    }

    @Override
    @Transactional(readOnly = true)
    public String getConnectedEmail(Long userId) {
        return requireConnection(userId).getGoogleEmail();
    }

    private GoogleDriveConnectionEntity requireConnection(Long userId) {
        return connectionRepository.findActiveByUserId(userId)
                .orElseThrow(() -> new BusinessException(
                        "DRIVE_NOT_CONNECTED", "Connect Google Drive first", HttpStatus.UNPROCESSABLE_ENTITY));
    }

    private String frontendUrl(String param, String value) {
        return UriComponentsBuilder.fromUriString(frontendBaseUrl + "/dashboard/drive")
                .queryParam(param, value)
                .build()
                .encode()
                .toUriString();
    }
}
