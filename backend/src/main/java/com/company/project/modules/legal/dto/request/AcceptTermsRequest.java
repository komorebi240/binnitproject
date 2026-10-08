package com.company.project.modules.legal.dto.request;

import jakarta.validation.constraints.NotNull;

/** The version the person has just read; the server accepts it only if it is still the newest one. */
public record AcceptTermsRequest(
        @NotNull(message = "version is required")
        Integer version
) {
}
