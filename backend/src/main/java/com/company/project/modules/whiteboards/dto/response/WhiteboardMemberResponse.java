package com.company.project.modules.whiteboards.dto.response;

import com.company.project.modules.whiteboards.domain.WhiteboardAccess;

/** The owner is listed too, with role OWNER, so a client can show everyone who sees the board in one list. */
public record WhiteboardMemberResponse(
        Long userId,
        String fullName,
        WhiteboardAccess role
) {
}
