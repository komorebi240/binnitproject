package com.company.project.modules.tasks.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** The tasks a "Clear all" (or its undo) is about: the ones the list showed. */
public record TaskIdsRequest(
        @NotEmpty(message = "taskIds is required")
        @Size(max = 500, message = "at most 500 tasks at once")
        List<@NotNull(message = "taskIds must not contain empty values") Long> taskIds
) {
}
