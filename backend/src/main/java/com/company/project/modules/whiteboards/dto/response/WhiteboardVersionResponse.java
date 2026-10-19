package com.company.project.modules.whiteboards.dto.response;

import java.time.Instant;

/** What a client polls to learn whether someone else saved since it last loaded the board. */
public record WhiteboardVersionResponse(
        Integer version,
        Instant updatedAt,
        String updatedByName
) {
}
