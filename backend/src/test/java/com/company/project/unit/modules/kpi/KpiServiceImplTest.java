package com.company.project.unit.modules.kpi;

import com.company.project.common.AssigneeType;
import com.company.project.common.AuthorityLevel;
import com.company.project.common.TaskPriority;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.kpi.domain.KpiConfigEntity;
import com.company.project.modules.kpi.dto.request.IncentiveTierInput;
import com.company.project.modules.kpi.dto.request.ReplaceIncentiveTiersRequest;
import com.company.project.modules.kpi.dto.request.UpdateKpiConfigRequest;
import com.company.project.modules.kpi.repository.KpiConfigRepository;
import com.company.project.modules.kpi.repository.KpiIncentiveTierRepository;
import com.company.project.modules.kpi.service.impl.KpiServiceImpl;
import com.company.project.modules.tasks.domain.TaskEntity;
import com.company.project.modules.tasks.repository.TaskRepository;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Covers the Phase 5 KPI scope rules (mirrors UserManagementServiceImplTest's hierarchy checks -
 * same rules, same 404-vs-403 split, see KpiServiceImpl.assertCallerCanView) and the score math's
 * edge cases (no tasks this month, no due dates set).
 */
@ExtendWith(MockitoExtension.class)
class KpiServiceImplTest {

    private static final Long COMPANY_A = 1L;
    private static final Long DEPT_ENGINEERING = 10L;
    private static final Long DEPT_SALES = 20L;
    private static final Long TEAM_BACKEND = 100L;

    @Mock
    private KpiConfigRepository kpiConfigRepository;
    @Mock
    private KpiIncentiveTierRepository kpiIncentiveTierRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PositionRepository positionRepository;

    private KpiServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new KpiServiceImpl(
                kpiConfigRepository, kpiIncentiveTierRepository, taskRepository, userRepository, positionRepository);
    }

    private UserPrincipal principal(AuthorityLevel level, Long departmentId, Long teamId) {
        return new UserPrincipal(1L, "caller", null, COMPANY_A, level, departmentId, teamId, true);
    }

    @Test
    void updateConfig_nonExecutiveIsRejected() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);

        assertThatThrownBy(() -> service.updateConfig(new UpdateKpiConfigRequest(0.5), deptHead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void replaceIncentiveTiers_nonExecutiveIsRejected() {
        UserPrincipal teamLead = principal(AuthorityLevel.TEAM_LEAD, DEPT_ENGINEERING, TEAM_BACKEND);
        var request = new ReplaceIncentiveTiersRequest(List.of(new IncentiveTierInput(90, "Xuat sac")));

        assertThatThrownBy(() -> service.replaceIncentiveTiers(request, teamLead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void getUserKpiSummary_teamLeadCanViewOwnTeamMember() {
        UserPrincipal teamLead = principal(AuthorityLevel.TEAM_LEAD, DEPT_ENGINEERING, TEAM_BACKEND);
        Long targetId = 42L;

        UserEntity target = new UserEntity(COMPANY_A, "member", "hash", "Team Member", null);
        setId(target, targetId);
        when(userRepository.findActiveById(targetId)).thenReturn(Optional.of(target));

        PositionEntity targetPosition =
                new PositionEntity(targetId, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, TEAM_BACKEND, null);
        when(positionRepository.findActiveByUserId(targetId)).thenReturn(Optional.of(targetPosition));
        when(taskRepository.findAllActiveByAssigneeUserIdAndCreatedAtAfter(any(), any())).thenReturn(List.of());
        when(kpiConfigRepository.findByCompanyId(COMPANY_A)).thenReturn(Optional.empty());
        when(kpiIncentiveTierRepository.findAllByCompanyIdOrderBySortOrder(COMPANY_A)).thenReturn(List.of());

        var summary = service.getUserKpiSummary(targetId, teamLead);

        assertThat(summary.totalAssigned()).isZero();
        assertThat(summary.kpiScore()).isZero();
    }

    @Test
    void getUserKpiSummary_teamLeadCannotViewOutsideOwnTeam() {
        UserPrincipal teamLead = principal(AuthorityLevel.TEAM_LEAD, DEPT_ENGINEERING, TEAM_BACKEND);
        Long targetId = 42L;

        UserEntity target = new UserEntity(COMPANY_A, "member", "hash", "Other Team Member", null);
        setId(target, targetId);
        when(userRepository.findActiveById(targetId)).thenReturn(Optional.of(target));

        PositionEntity targetPosition =
                new PositionEntity(targetId, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, 999L, null);
        when(positionRepository.findActiveByUserId(targetId)).thenReturn(Optional.of(targetPosition));

        assertThatThrownBy(() -> service.getUserKpiSummary(targetId, teamLead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void getUserKpiSummary_crossCompanyTargetIsNotFound() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        Long targetId = 42L;

        UserEntity target = new UserEntity(999L, "other-company", "hash", "Someone Else", null);
        setId(target, targetId);
        when(userRepository.findActiveById(targetId)).thenReturn(Optional.of(target));

        assertThatThrownBy(() -> service.getUserKpiSummary(targetId, executive))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getMyKpiSummary_noTasksThisMonthScoresZeroWithoutDivideByZero() {
        UserPrincipal employee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        UserEntity user = new UserEntity(COMPANY_A, "employee", "hash", "Employee Person", null);
        setId(user, 1L);
        when(userRepository.findActiveById(1L)).thenReturn(Optional.of(user));
        when(taskRepository.findAllActiveByAssigneeUserIdAndCreatedAtAfter(any(), any())).thenReturn(List.of());
        when(kpiConfigRepository.findByCompanyId(COMPANY_A)).thenReturn(Optional.empty());
        when(kpiIncentiveTierRepository.findAllByCompanyIdOrderBySortOrder(COMPANY_A)).thenReturn(List.of());

        var summary = service.getMyKpiSummary(employee);

        assertThat(summary.totalAssigned()).isZero();
        assertThat(summary.completed()).isZero();
        assertThat(summary.kpiScore()).isZero();
    }

    @Test
    void getMyKpiSummary_completedTaskWithNoDueDateIsNotPenalizedForBeingLate() {
        UserPrincipal employee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        UserEntity user = new UserEntity(COMPANY_A, "employee", "hash", "Employee Person", null);
        setId(user, 1L);
        when(userRepository.findActiveById(1L)).thenReturn(Optional.of(user));

        TaskEntity doneNoDueDate = new TaskEntity(
                COMPANY_A, "Task", null, AssigneeType.USER, 1L, null, 2L, TaskPriority.MEDIUM, null);
        doneNoDueDate.accept();
        doneNoDueDate.complete();
        when(taskRepository.findAllActiveByAssigneeUserIdAndCreatedAtAfter(any(), any()))
                .thenReturn(List.of(doneNoDueDate));
        when(kpiConfigRepository.findByCompanyId(COMPANY_A))
                .thenReturn(Optional.of(new KpiConfigEntity(COMPANY_A, 0.7)));
        when(kpiIncentiveTierRepository.findAllByCompanyIdOrderBySortOrder(COMPANY_A)).thenReturn(List.of());

        var summary = service.getMyKpiSummary(employee);

        assertThat(summary.completionRatePercent()).isEqualTo(100.0);
        assertThat(summary.onTimeRatePercent()).isEqualTo(100.0);
        assertThat(summary.kpiScore()).isEqualTo(100);
    }

    @Test
    void getMyKpiSummary_cancelledTasksAreExcludedFromTheDenominator() {
        UserPrincipal employee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        UserEntity user = new UserEntity(COMPANY_A, "employee", "hash", "Employee Person", null);
        setId(user, 1L);
        when(userRepository.findActiveById(1L)).thenReturn(Optional.of(user));

        TaskEntity done = new TaskEntity(
                COMPANY_A, "Done task", null, AssigneeType.USER, 1L, null, 2L, TaskPriority.MEDIUM, null);
        done.accept();
        done.complete();
        TaskEntity cancelled = new TaskEntity(
                COMPANY_A, "Cancelled task", null, AssigneeType.USER, 1L, null, 2L, TaskPriority.LOW, null);
        cancelled.cancel();

        when(taskRepository.findAllActiveByAssigneeUserIdAndCreatedAtAfter(any(), any()))
                .thenReturn(List.of(done, cancelled));
        when(kpiConfigRepository.findByCompanyId(COMPANY_A))
                .thenReturn(Optional.of(new KpiConfigEntity(COMPANY_A, 0.7)));
        when(kpiIncentiveTierRepository.findAllByCompanyIdOrderBySortOrder(COMPANY_A)).thenReturn(List.of());

        var summary = service.getMyKpiSummary(employee);

        assertThat(summary.totalAssigned()).isEqualTo(1);
        assertThat(summary.completed()).isEqualTo(1);
        assertThat(summary.completionRatePercent()).isEqualTo(100.0);
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
