package com.company.project.modules.whiteboards.dto.request;

import com.company.project.modules.whiteboards.domain.WhiteboardRole;
import jakarta.validation.constraints.NotNull;

public record SetWhiteboardMemberRequest(
        @NotNull(message = "role is required")
        WhiteboardRole role
) {
}
