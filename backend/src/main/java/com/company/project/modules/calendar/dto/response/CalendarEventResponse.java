package com.company.project.modules.calendar.dto.response;

import com.company.project.common.CalendarEventStatus;
import com.company.project.common.CalendarEventType;

import java.time.Instant;

public record CalendarEventResponse(
        Long id,
        String title,
        String description,
        CalendarEventType eventType,
        Instant startAt,
        Instant endAt,
        CalendarEventStatus status,
        Long createdByUserId,
        String createdByName,
        boolean createdBySelf
) {
}
