package com.company.project.modules.identity.dto.request;

import com.company.project.common.PresenceStatus;
import jakarta.validation.constraints.NotNull;

public record UpdatePresenceRequest(
        @NotNull(message = "status is required") PresenceStatus status
) {
}
