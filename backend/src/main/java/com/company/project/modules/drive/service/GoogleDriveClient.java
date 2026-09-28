package com.company.project.modules.drive.service;

import com.company.project.common.exception.BusinessException;
import com.company.project.security.GoogleProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Talks to Google's OAuth and Drive REST APIs directly (no Google SDK dependency — see Phase 3
 * plan section 1 on avoiding an unnecessary dependency). Any failure calling out to Google is
 * translated to a BusinessException here so it never leaks raw Google error payloads or stack
 * traces to our API clients (CLAUDE.md section 14).
 */
@Service
@EnableConfigurationProperties(GoogleProperties.class)
public class GoogleDriveClient {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveClient.class);

    private static final String AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
    private static final String USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";
    private static final String DRIVE_FILES_ENDPOINT = "https://www.googleapis.com/drive/v3/files";
    // Full "drive" scope (not the narrower "drive.file") because approving a request must call
    // permissions.create on a pre-existing folder the app didn't create — see Phase 3 plan.
    private static final String SCOPE = "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email";

    private final GoogleProperties properties;
    private final RestClient restClient = RestClient.create();

    public GoogleDriveClient(GoogleProperties properties) {
        this.properties = properties;
    }

    public String buildAuthorizationUrl(String state) {
        return UriComponentsBuilder.fromUriString(AUTHORIZATION_ENDPOINT)
                .queryParam("client_id", properties.clientId())
                .queryParam("redirect_uri", properties.redirectUri())
                .queryParam("response_type", "code")
                .queryParam("scope", SCOPE)
                .queryParam("access_type", "offline")
                .queryParam("prompt", "consent")
                .queryParam("state", state)
                .build()
                // .build() alone does not percent-encode query values — the space in SCOPE
                // was going out as a literal space in the redirect URL. Found by actually
                // inspecting the generated Location header, not by reading the code.
                .encode()
                .toUriString();
    }

    public GoogleTokenResponse exchangeAuthorizationCode(String code) {
        return postToken(Map.of(
                "code", code,
                "client_id", properties.clientId(),
                "client_secret", properties.clientSecret(),
                "redirect_uri", properties.redirectUri(),
                "grant_type", "authorization_code"));
    }

    public String refreshAccessToken(String refreshToken) {
        GoogleTokenResponse response = postToken(Map.of(
                "refresh_token", refreshToken,
                "client_id", properties.clientId(),
                "client_secret", properties.clientSecret(),
                "grant_type", "refresh_token"));
        return response.accessToken();
    }

    public String fetchAccountEmail(String accessToken) {
        try {
            GoogleUserInfoResponse response = restClient.get()
                    .uri(USERINFO_ENDPOINT)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(GoogleUserInfoResponse.class);
            return response != null ? response.email() : null;
        } catch (RestClientException e) {
            throw driveError(e);
        }
    }

    public GoogleFolderMetadata getFolderMetadata(String folderId, String accessToken) {
        try {
            return restClient.get()
                    .uri(DRIVE_FILES_ENDPOINT + "/{id}?fields=id,name", folderId)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(GoogleFolderMetadata.class);
        } catch (RestClientException e) {
            log.warn("Google Drive files.get failed for folder {}", folderId, e);
            throw new BusinessException(
                    "DRIVE_FOLDER_NOT_ACCESSIBLE",
                    "Could not read that Google Drive folder — check the link/ID and that this Drive account can access it",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    public void grantReaderPermission(String folderId, String granteeEmail, String accessToken) {
        try {
            Map<String, String> body = new LinkedHashMap<>();
            body.put("role", "reader");
            body.put("type", "user");
            body.put("emailAddress", granteeEmail);

            restClient.post()
                    .uri(DRIVE_FILES_ENDPOINT + "/{id}/permissions?sendNotificationEmail=true", folderId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + accessToken)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw driveError(e);
        }
    }

    private GoogleTokenResponse postToken(Map<String, String> form) {
        try {
            return restClient.post()
                    .uri(TOKEN_ENDPOINT)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(encodeForm(form))
                    .retrieve()
                    .body(GoogleTokenResponse.class);
        } catch (RestClientException e) {
            throw driveError(e);
        }
    }

    private static String encodeForm(Map<String, String> form) {
        StringBuilder sb = new StringBuilder();
        form.forEach((key, value) -> {
            if (!sb.isEmpty()) {
                sb.append('&');
            }
            sb.append(java.net.URLEncoder.encode(key, java.nio.charset.StandardCharsets.UTF_8))
                    .append('=')
                    .append(java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8));
        });
        return sb.toString();
    }

    private BusinessException driveError(RestClientException e) {
        log.warn("Google API call failed", e);
        return new BusinessException(
                "DRIVE_API_ERROR", "Google Drive request failed", HttpStatus.BAD_GATEWAY);
    }
}
