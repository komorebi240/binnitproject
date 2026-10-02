package com.company.project.modules.calendar.dto.request;

import com.company.project.common.CalendarEventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record CreateCalendarEventRequest(
        @NotBlank(message = "title is required")
        String title,

        String description,

        @NotNull(message = "eventType is required")
        CalendarEventType eventType,

        @NotNull(message = "startAt is required")
        Instant startAt,

        Instant endAt
) {
}
