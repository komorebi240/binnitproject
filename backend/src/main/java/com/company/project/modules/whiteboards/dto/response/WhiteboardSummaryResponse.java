package com.company.project.modules.whiteboards.dto.response;

import com.company.project.modules.whiteboards.domain.WhiteboardAccess;

import java.time.Instant;

/** {@code access} is the caller's own relation to the board. */
public record WhiteboardSummaryResponse(
        Long id,
        String title,
        Long ownerId,
        String ownerName,
        WhiteboardAccess access,
        Integer version,
        Instant updatedAt
) {
}
