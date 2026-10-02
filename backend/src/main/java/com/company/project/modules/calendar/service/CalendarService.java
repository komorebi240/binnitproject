package com.company.project.modules.calendar.service;

import com.company.project.modules.calendar.dto.request.CreateCalendarEventRequest;
import com.company.project.modules.calendar.dto.response.CalendarEventResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

public interface CalendarService {

    /** Only the caller's own events - nobody else's, not even a manager's (Phase 6 plan). */
    List<CalendarEventResponse> listMyEvents(UserPrincipal caller);

    CalendarEventResponse createOwnEvent(CreateCalendarEventRequest request, UserPrincipal caller);

    /** Manager creates an event FOR userId - same scope rule as KpiServiceImpl.assertCallerCanView. Status starts PENDING. */
    CalendarEventResponse createEventForUser(Long userId, CreateCalendarEventRequest request, UserPrincipal caller);

    CalendarEventResponse acceptEvent(Long eventId, UserPrincipal caller);

    CalendarEventResponse declineEvent(Long eventId, UserPrincipal caller);

    void deleteEvent(Long eventId, UserPrincipal caller);
}
