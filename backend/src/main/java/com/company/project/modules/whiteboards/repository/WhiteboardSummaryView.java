package com.company.project.modules.whiteboards.repository;

import java.time.Instant;

/** One row of the board list: everything but the drawing. */
public record WhiteboardSummaryView(Long id, String title, Long ownerId, Integer version, Instant updatedAt) {
}
