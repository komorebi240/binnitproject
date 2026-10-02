package com.company.project.modules.drive.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/** Shape of Google's OAuth token endpoint response - refreshToken is null on a refresh-grant call. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GoogleTokenResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("refresh_token") String refreshToken,
        @JsonProperty("expires_in") Integer expiresInSeconds,
        @JsonProperty("scope") String scope
) {
}
