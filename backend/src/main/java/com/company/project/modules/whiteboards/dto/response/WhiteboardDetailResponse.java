package com.company.project.modules.whiteboards.dto.response;

import com.company.project.modules.whiteboards.domain.WhiteboardAccess;
import com.fasterxml.jackson.annotation.JsonRawValue;

import java.time.Instant;
import java.util.List;

/**
 * {@code scene} is sent as the JSON object it is stored as ({"elements":[...]}): WhiteboardScenes wrote it from a parsed
 * tree, so it is always well-formed and re-parsing it on every load would only cost time.
 */
public record WhiteboardDetailResponse(
        Long id,
        String title,
        Long ownerId,
        String ownerName,
        WhiteboardAccess access,
        Integer version,
        Instant updatedAt,
        String updatedByName,
        List<WhiteboardMemberResponse> members,
        @JsonRawValue String scene
) {
}
