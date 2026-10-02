package com.company.project.modules.tasks.dto.request;

import jakarta.validation.constraints.Size;

/** A null/blank {@code driveUrl} clears the link. */
public record UpdateDriveUrlRequest(
        @Size(max = 500, message = "driveUrl must be at most 500 characters")
        String driveUrl
) {
}
