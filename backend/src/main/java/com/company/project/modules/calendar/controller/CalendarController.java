package com.company.project.modules.calendar.controller;

import com.company.project.common.ApiResponse;
import com.company.project.modules.calendar.dto.request.CreateCalendarEventRequest;
import com.company.project.modules.calendar.dto.response.CalendarEventResponse;
import com.company.project.modules.calendar.service.CalendarService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/calendar")
public class CalendarController {

    private final CalendarService calendarService;

    public CalendarController(CalendarService calendarService) {
        this.calendarService = calendarService;
    }

    @GetMapping("/me")
    public ApiResponse<List<CalendarEventResponse>> listMine(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(calendarService.listMyEvents(caller));
    }

    @PostMapping("/me")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CalendarEventResponse> createOwn(
            @Valid @RequestBody CreateCalendarEventRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(calendarService.createOwnEvent(request, caller));
    }

    @PostMapping("/users/{id}")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyAuthority('EXECUTIVE','DEPARTMENT_HEAD','TEAM_LEAD')")
    public ApiResponse<CalendarEventResponse> createForUser(
            @PathVariable Long id,
            @Valid @RequestBody CreateCalendarEventRequest request,
            @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(calendarService.createEventForUser(id, request, caller));
    }

    @PatchMapping("/{id}/accept")
    public ApiResponse<CalendarEventResponse> accept(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(calendarService.acceptEvent(id, caller));
    }

    @PatchMapping("/{id}/decline")
    public ApiResponse<CalendarEventResponse> decline(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(calendarService.declineEvent(id, caller));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        calendarService.deleteEvent(id, caller);
    }
}
