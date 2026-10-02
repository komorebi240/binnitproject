package com.company.project.modules.calendar.service.impl;

import com.company.project.common.CalendarEventStatus;
import com.company.project.common.NotificationType;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.calendar.domain.CalendarEventEntity;
import com.company.project.modules.calendar.dto.request.CreateCalendarEventRequest;
import com.company.project.modules.calendar.dto.response.CalendarEventResponse;
import com.company.project.modules.calendar.repository.CalendarEventRepository;
import com.company.project.modules.calendar.service.CalendarService;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.notifications.service.NotificationService;
import com.company.project.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Scope check for creating an event FOR someone else mirrors
 * {@code KpiServiceImpl.assertCallerCanView} exactly (same hierarchy: EXECUTIVE/company,
 * DEPARTMENT_HEAD/own department, TEAM_LEAD/own team) - duplicated rather than extracted into a
 * shared helper, consistent with how this same check already appears independently in
 * UserManagementServiceImpl, TaskServiceImpl, and KpiServiceImpl (CLAUDE.md section 1: no new
 * abstraction introduced just for this).
 */
@Service
public class CalendarServiceImpl implements CalendarService {

    private final CalendarEventRepository calendarEventRepository;
    private final UserRepository userRepository;
    private final PositionRepository positionRepository;
    private final NotificationService notificationService;

    public CalendarServiceImpl(
            CalendarEventRepository calendarEventRepository,
            UserRepository userRepository,
            PositionRepository positionRepository,
            NotificationService notificationService
    ) {
        this.calendarEventRepository = calendarEventRepository;
        this.userRepository = userRepository;
        this.positionRepository = positionRepository;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CalendarEventResponse> listMyEvents(UserPrincipal caller) {
        return toResponses(calendarEventRepository.findAllActiveByUserId(caller.getUserId()), caller.getUserId());
    }

    @Override
    @Transactional
    public CalendarEventResponse createOwnEvent(CreateCalendarEventRequest request, UserPrincipal caller) {
        CalendarEventEntity saved = calendarEventRepository.save(new CalendarEventEntity(
                caller.getUserId(), caller.getUserId(), request.title(), request.description(),
                request.eventType(), request.startAt(), request.endAt(), CalendarEventStatus.CONFIRMED));
        return toResponse(saved, caller.getUserId());
    }

    @Override
    @Transactional
    public CalendarEventResponse createEventForUser(Long userId, CreateCalendarEventRequest request, UserPrincipal caller) {
        UserEntity target = userRepository.findActiveById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (!target.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("User", userId);
        }
        PositionEntity targetPosition = positionRepository.findActiveByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        assertCallerCanAddFor(caller, targetPosition);

        CalendarEventEntity saved = calendarEventRepository.save(new CalendarEventEntity(
                userId, caller.getUserId(), request.title(), request.description(),
                request.eventType(), request.startAt(), request.endAt(), CalendarEventStatus.PENDING));

        notificationService.notify(
                userId,
                NotificationType.CALENDAR_EVENT_INVITE,
                "Lịch mới cần bạn xác nhận",
                caller.getUsername() + " đã thêm \"" + request.title() + "\" vào lịch của bạn",
                "CALENDAR_EVENT",
                saved.getId());

        return toResponse(saved, caller.getUserId());
    }

    @Override
    @Transactional
    public CalendarEventResponse acceptEvent(Long eventId, UserPrincipal caller) {
        CalendarEventEntity event = requireOwnEvent(eventId, caller);
        requirePending(event);
        event.accept();
        return toResponse(event, caller.getUserId());
    }

    @Override
    @Transactional
    public CalendarEventResponse declineEvent(Long eventId, UserPrincipal caller) {
        CalendarEventEntity event = requireOwnEvent(eventId, caller);
        requirePending(event);
        event.decline();
        return toResponse(event, caller.getUserId());
    }

    /** Pre-validated here (not left to CalendarEventEntity's IllegalArgumentException last resort) so a double-accept is a clean 422, not a 500. */
    private void requirePending(CalendarEventEntity event) {
        if (event.getStatus() != CalendarEventStatus.PENDING) {
            throw new BusinessException(
                    "INVALID_EVENT_STATUS",
                    "Event is already " + event.getStatus(),
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    @Override
    @Transactional
    public void deleteEvent(Long eventId, UserPrincipal caller) {
        CalendarEventEntity event = requireOwnEvent(eventId, caller);
        event.markDeleted();
    }

    /** Mirrors KpiServiceImpl.assertCallerCanView - same hierarchy, no new rule. */
    private void assertCallerCanAddFor(UserPrincipal caller, PositionEntity target) {
        switch (caller.getAuthorityLevel()) {
            case EXECUTIVE -> {
                // Any position within the same company (already verified by the caller).
            }
            case DEPARTMENT_HEAD -> {
                if (!caller.getDepartmentId().equals(target.getDepartmentId())) {
                    throw new AccessDeniedException("You can only add calendar events for members of your own department");
                }
            }
            case TEAM_LEAD -> {
                if (!caller.getTeamId().equals(target.getTeamId())) {
                    throw new AccessDeniedException("You can only add calendar events for members of your own team");
                }
            }
            case EMPLOYEE -> throw new AccessDeniedException("Employees cannot add a calendar event for someone else");
        }
    }

    private CalendarEventEntity requireOwnEvent(Long eventId, UserPrincipal caller) {
        CalendarEventEntity event = calendarEventRepository.findActiveById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("CalendarEvent", eventId));
        // Calendar is strictly private - not even the event's creator (a manager) can act on it
        // afterward, only the owner whose calendar it lives on.
        if (!event.getUserId().equals(caller.getUserId())) {
            throw new ResourceNotFoundException("CalendarEvent", eventId);
        }
        return event;
    }

    private List<CalendarEventResponse> toResponses(List<CalendarEventEntity> events, Long callerId) {
        Map<Long, String> creatorNames = userRepository.findAllById(
                        events.stream().map(CalendarEventEntity::getCreatedByUserId).distinct().toList())
                .stream()
                .collect(java.util.stream.Collectors.toMap(UserEntity::getId, UserEntity::getFullName));

        return events.stream()
                .map(e -> new CalendarEventResponse(
                        e.getId(), e.getTitle(), e.getDescription(), e.getEventType(), e.getStartAt(), e.getEndAt(),
                        e.getStatus(), e.getCreatedByUserId(), creatorNames.get(e.getCreatedByUserId()),
                        e.getCreatedByUserId().equals(callerId)))
                .toList();
    }

    private CalendarEventResponse toResponse(CalendarEventEntity e, Long callerId) {
        String creatorName = userRepository.findActiveById(e.getCreatedByUserId())
                .map(UserEntity::getFullName).orElse(null);
        return new CalendarEventResponse(
                e.getId(), e.getTitle(), e.getDescription(), e.getEventType(), e.getStartAt(), e.getEndAt(),
                e.getStatus(), e.getCreatedByUserId(), creatorName, e.getCreatedByUserId().equals(callerId));
    }
}
