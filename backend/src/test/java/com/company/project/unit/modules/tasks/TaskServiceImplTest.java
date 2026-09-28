package com.company.project.unit.modules.tasks;

import com.company.project.common.AssigneeType;
import com.company.project.common.AuthorityLevel;
import com.company.project.common.TaskPriority;
import com.company.project.common.TaskStatus;
import com.company.project.common.exception.BusinessException;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.tasks.domain.TaskEntity;
import com.company.project.modules.tasks.dto.request.CreateTaskRequest;
import com.company.project.modules.tasks.repository.TaskRepository;
import com.company.project.modules.tasks.service.impl.TaskServiceImpl;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Covers the assignment hierarchy and status-transition rules from the Phase 2 plan — the
 * same rules were also exercised by hand via curl/browser (see backend/README.md "Verified"),
 * this turns the trickiest ones into fast regression coverage.
 */
@ExtendWith(MockitoExtension.class)
class TaskServiceImplTest {

    private static final Long COMPANY_A = 1L;
    private static final Long DEPT_ENGINEERING = 10L;
    private static final Long DEPT_SALES = 20L;
    private static final Long TEAM_BACKEND = 100L;
    private static final Long EMPLOYEE_IN_ENGINEERING = 5L;
    private static final Long EMPLOYEE_IN_SALES = 6L;

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private PositionRepository positionRepository;

    private TaskServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new TaskServiceImpl(taskRepository, userRepository, departmentRepository, positionRepository);
    }

    private UserPrincipal principal(AuthorityLevel level, Long departmentId, Long teamId) {
        return new UserPrincipal(1L, "caller", null, COMPANY_A, level, departmentId, teamId, true);
    }

    private UserEntity activeUser(Long companyId) {
        UserEntity user = new UserEntity(companyId, "target", "hash", "Target User", null);
        setId(user, EMPLOYEE_IN_ENGINEERING);
        return user;
    }

    @Test
    void createTask_departmentHeadCannotAssignToOtherDepartmentMember() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);
        CreateTaskRequest request = new CreateTaskRequest(
                "Do the thing", null, AssigneeType.USER, EMPLOYEE_IN_SALES, null, null, null);

        UserEntity targetUser = new UserEntity(COMPANY_A, "salesperson", "hash", "Sales Person", null);
        setId(targetUser, EMPLOYEE_IN_SALES);
        when(userRepository.findActiveById(EMPLOYEE_IN_SALES)).thenReturn(Optional.of(targetUser));
        when(positionRepository.findActiveByUserId(EMPLOYEE_IN_SALES))
                .thenReturn(Optional.of(new PositionEntity(EMPLOYEE_IN_SALES, AuthorityLevel.EMPLOYEE, DEPT_SALES, null, null)));

        assertThatThrownBy(() -> service.createTask(request, deptHead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void createTask_teamLeadCannotAssignToWholeDepartment() {
        UserPrincipal teamLead = principal(AuthorityLevel.TEAM_LEAD, DEPT_ENGINEERING, TEAM_BACKEND);
        CreateTaskRequest request = new CreateTaskRequest(
                "Do the thing", null, AssigneeType.DEPARTMENT, null, DEPT_ENGINEERING, null, null);

        DepartmentEntity department = new DepartmentEntity(COMPANY_A, "Engineering");
        setId(department, DEPT_ENGINEERING);
        when(departmentRepository.findActiveById(DEPT_ENGINEERING)).thenReturn(Optional.of(department));

        assertThatThrownBy(() -> service.createTask(request, teamLead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void createTask_executiveCanAssignToAnyDepartmentInOwnCompany() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        CreateTaskRequest request = new CreateTaskRequest(
                "Ship it", "details", AssigneeType.DEPARTMENT, null, DEPT_SALES, TaskPriority.HIGH, null);

        DepartmentEntity department = new DepartmentEntity(COMPANY_A, "Sales");
        setId(department, DEPT_SALES);
        when(departmentRepository.findActiveById(DEPT_SALES)).thenReturn(Optional.of(department));
        when(taskRepository.save(any())).thenAnswer(inv -> {
            TaskEntity t = inv.getArgument(0);
            setId(t, 77L);
            return t;
        });

        var response = service.createTask(request, executive);

        assertThat(response.assigneeType()).isEqualTo(AssigneeType.DEPARTMENT);
        assertThat(response.assigneeDepartmentId()).isEqualTo(DEPT_SALES);
        assertThat(response.priority()).isEqualTo(TaskPriority.HIGH);
    }

    @Test
    void acceptTask_onlyTheAssigneeMayAccept() {
        UserPrincipal someoneElse = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Do it", null, AssigneeType.USER, 999L, null, 2L, TaskPriority.MEDIUM, null);
        setId(task, 5L);
        when(taskRepository.findActiveById(5L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.acceptTask(5L, someoneElse))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void completeTask_beforeAcceptFails() {
        UserPrincipal assignee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Do it", null, AssigneeType.USER, assignee.getUserId(), null, 2L, TaskPriority.MEDIUM, null);
        setId(task, 5L);
        when(taskRepository.findActiveById(5L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.completeTask(5L, assignee))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ASSIGNED");
    }

    @Test
    void acceptTask_departmentHeadCanAcceptOnBehalfOfOwnDepartment() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Team-wide task", null, AssigneeType.DEPARTMENT, null, DEPT_ENGINEERING, 2L, TaskPriority.MEDIUM, null);
        setId(task, 6L);
        when(taskRepository.findActiveById(6L)).thenReturn(Optional.of(task));

        var response = service.acceptTask(6L, deptHead);

        assertThat(response.status()).isEqualTo(TaskStatus.ACCEPTED);
    }

    @Test
    void acceptTask_regularEmployeeCannotAcceptOnBehalfOfDepartment() {
        UserPrincipal employee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Team-wide task", null, AssigneeType.DEPARTMENT, null, DEPT_ENGINEERING, 2L, TaskPriority.MEDIUM, null);
        setId(task, 6L);
        when(taskRepository.findActiveById(6L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.acceptTask(6L, employee))
                .isInstanceOf(AccessDeniedException.class);
    }

    private static void setId(Object entity, Long id) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
