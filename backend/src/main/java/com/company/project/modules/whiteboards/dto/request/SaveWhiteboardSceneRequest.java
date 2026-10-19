package com.company.project.modules.whiteboards.dto.request;

import com.company.project.modules.whiteboards.service.WhiteboardScenes;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * The whole element list as the client has it after merging, and the board version it merged onto. Each element is
 * checked by WhiteboardScenes (shape, allowed types, links), not here.
 */
public record SaveWhiteboardSceneRequest(
        @NotNull(message = "baseVersion is required")
        @PositiveOrZero(message = "baseVersion must not be negative")
        Integer baseVersion,

        @NotNull(message = "elements is required")
        @Size(max = WhiteboardScenes.MAX_ELEMENTS, message = "A whiteboard can hold at most " + WhiteboardScenes.MAX_ELEMENTS + " elements")
        List<ObjectNode> elements
) {
}
