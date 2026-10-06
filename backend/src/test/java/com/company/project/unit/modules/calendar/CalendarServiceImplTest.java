package com.company.project.unit.modules.calendar;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.CalendarEventStatus;
import com.company.project.common.CalendarEventType;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.calendar.domain.CalendarEventEntity;
import com.company.project.modules.calendar.dto.request.CreateCalendarEventRequest;
import com.company.project.modules.calendar.repository.CalendarEventRepository;
import com.company.project.modules.calendar.service.impl.CalendarServiceImpl;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.notifications.service.NotificationService;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the Phase 6 calendar rules: the same scope hierarchy as KpiServiceImpl (reused by
 * design, not reinvented) for adding an event to someone else's calendar, and the "even the
 * creator can't act on it afterward" rule for accept/decline/delete.
 */
@ExtendWith(MockitoExtension.class)
class CalendarServiceImplTest {

    private static final Long COMPANY_A = 1L;
    private static final Long DEPT_ENGINEERING = 10L;
    private static final Long TEAM_BACKEND = 100L;

    @Mock
    private CalendarEventRepository calendarEventRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PositionRepository positionRepository;
    @Mock
    private NotificationService notificationService;

    private CalendarServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CalendarServiceImpl(calendarEventRepository, userRepository, positionRepository, notificationService);
    }

    private UserPrincipal principal(Long userId, AuthorityLevel level, Long departmentId, Long teamId) {
        return new UserPrincipal(userId, "caller", null, COMPANY_A, level, departmentId, teamId, true);
    }

    private CreateCalendarEventRequest request() {
        return new CreateCalendarEventRequest("Họp", null, CalendarEventType.MEETING, Instant.now(), null);
    }

    @Test
    void createOwnEvent_rejectsATripThatEndsBeforeItStarts() {
        UserPrincipal owner = principal(2L, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, TEAM_BACKEND);
        Instant start = Instant.parse("2026-10-09T00:00:00Z");
        CreateCalendarEventRequest swapped = new CreateCalendarEventRequest(
                "Ha Noi", null, CalendarEventType.BUSINESS_TRIP, start, start.minusSeconds(86_400));

        assertThatThrownBy(() -> service.createOwnEvent(swapped, owner))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cannot end before");
        verify(calendarEventRepository, never()).save(any());
    }

    @Test
    void createEventForUser_teamLeadCanAddForOwnTeamMemberAndSendsNotification() {
        UserPrincipal teamLead = principal(1L, AuthorityLevel.TEAM_LEAD, DEPT_ENGINEERING, TEAM_BACKEND);
        Long targetId = 42L;

        UserEntity target = new UserEntity(COMPANY_A, "member", "hash", "Team Member", null);
        setId(target, targetId);
        when(userRepository.findActiveById(targetId)).thenReturn(Optional.of(target));
        PositionEntity targetPosition =
                new PositionEntity(targetId, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, TEAM_BACKEND, null);
        when(positionRepository.findActiveByUserId(targetId)).thenReturn(Optional.of(targetPosition));
        when(calendarEventRepository.save(any())).thenAnswer(inv -> {
            CalendarEventEntity e = inv.getArgument(0);
            setId(e, 99L);
            return e;
        });

        var response = service.createEventForUser(targetId, request(), teamLead);

        assertThat(response.status()).isEqualTo(CalendarEventStatus.PENDING);
        verify(notificationService).notify(eq(targetId), any(), anyString(), anyString(), anyString(), eq(99L));
    }

    @Test
    void createEventForUser_teamLeadCannotAddOutsideOwnTeam() {
        UserPrincipal teamLead = principal(1L, AuthorityLevel.TEAM_LEAD, DEPT_ENGINEERING, TEAM_BACKEND);
        Long targetId = 42L;

        UserEntity target = new UserEntity(COMPANY_A, "member", "hash", "Other Team Member", null);
        setId(target, targetId);
        when(userRepository.findActiveById(targetId)).thenReturn(Optional.of(target));
        PositionEntity targetPosition = new PositionEntity(targetId, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, 999L, null);
        when(positionRepository.findActiveByUserId(targetId)).thenReturn(Optional.of(targetPosition));

        assertThatThrownBy(() -> service.createEventForUser(targetId, request(), teamLead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void acceptEvent_ownerCanAcceptPendingEvent() {
        UserPrincipal owner = principal(2L, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, TEAM_BACKEND);
        CalendarEventEntity event = new CalendarEventEntity(
                2L, 1L, "Họp", null, CalendarEventType.MEETING, Instant.now(), null, CalendarEventStatus.PENDING);
        setId(event, 99L);
        when(calendarEventRepository.findActiveById(99L)).thenReturn(Optional.of(event));
        when(userRepository.findActiveById(1L)).thenReturn(Optional.empty());

        var response = service.acceptEvent(99L, owner);

        assertThat(response.status()).isEqualTo(CalendarEventStatus.CONFIRMED);
    }

    @Test
    void acceptEvent_creatorCannotAcceptOnBehalfOfOwner() {
        UserPrincipal creator = principal(1L, AuthorityLevel.TEAM_LEAD, DEPT_ENGINEERING, TEAM_BACKEND);
        CalendarEventEntity event = new CalendarEventEntity(
                2L, 1L, "Họp", null, CalendarEventType.MEETING, Instant.now(), null, CalendarEventStatus.PENDING);
        setId(event, 99L);
        when(calendarEventRepository.findActiveById(99L)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> service.acceptEvent(99L, creator))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void acceptEvent_alreadyDecidedEventIsRejected() {
        UserPrincipal owner = principal(2L, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, TEAM_BACKEND);
        CalendarEventEntity event = new CalendarEventEntity(
                2L, 1L, "Họp", null, CalendarEventType.MEETING, Instant.now(), null, CalendarEventStatus.CONFIRMED);
        setId(event, 99L);
        when(calendarEventRepository.findActiveById(99L)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> service.acceptEvent(99L, owner))
                .isInstanceOf(BusinessException.class);
    }

    private static void setId(Object entity, Long id) {
        try {
            Field field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
