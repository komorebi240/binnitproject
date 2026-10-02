package com.company.project.modules.notes.dto.response;

import java.time.Instant;

public record NoteResponse(Long id, String title, String content, boolean pinned, Instant createdAt, Instant updatedAt) {
}
