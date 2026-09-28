package com.company.project.unit.modules.identity;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.exception.BusinessException;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.dto.request.CreateUserRequest;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.TeamRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.impl.UserManagementServiceImpl;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Covers the hierarchy rules from the Phase 1 plan that a manual curl/browser session already
 * exercised once (see backend/README.md "Verified") — turning that into fast, repeatable
 * regression coverage instead of relying on hand-testing again next time this changes.
 */
@ExtendWith(MockitoExtension.class)
class UserManagementServiceImplTest {

    private static final Long COMPANY_A = 1L;
    private static final Long DEPT_ENGINEERING = 10L;
    private static final Long DEPT_SALES = 20L;
    private static final Long TEAM_BACKEND = 100L;

    @Mock
    private UserRepository userRepository;
    @Mock
    private PositionRepository positionRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private UserManagementServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new UserManagementServiceImpl(
                userRepository, positionRepository, departmentRepository, teamRepository, passwordEncoder);
    }

    private UserPrincipal principal(AuthorityLevel level, Long departmentId, Long teamId) {
        return new UserPrincipal(1L, "caller", null, COMPANY_A, level, departmentId, teamId, true);
    }

    @Test
    void createUser_departmentHeadCannotGrantExecutive() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);
        CreateUserRequest request = new CreateUserRequest(
                "newuser", "password123", "New User", null, AuthorityLevel.EXECUTIVE, null, null, null);

        assertThatThrownBy(() -> service.createUser(request, deptHead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void createUser_departmentHeadCannotGrantInDifferentDepartment() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);
        CreateUserRequest request = new CreateUserRequest(
                "newuser", "password123", "New User", null, AuthorityLevel.EMPLOYEE, null, DEPT_SALES, null);

        assertThatThrownBy(() -> service.createUser(request, deptHead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void createUser_departmentHeadCanGrantEmployeeInOwnDepartment() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);
        CreateUserRequest request = new CreateUserRequest(
                "newuser", "password123", "New User", null, AuthorityLevel.EMPLOYEE, null, DEPT_ENGINEERING, null);

        DepartmentEntity department = new DepartmentEntity(COMPANY_A, "Engineering");
        when(departmentRepository.findActiveById(DEPT_ENGINEERING)).thenReturn(Optional.of(department));
        setId(department, DEPT_ENGINEERING);
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        UserEntity savedUser = new UserEntity(COMPANY_A, "newuser", "hashed", "New User", null);
        setId(savedUser, 99L);
        when(userRepository.save(any())).thenReturn(savedUser);
        when(positionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var response = service.createUser(request, deptHead);

        assertThat(response.authorityLevel()).isEqualTo(AuthorityLevel.EMPLOYEE);
        assertThat(response.departmentId()).isEqualTo(DEPT_ENGINEERING);
    }

    @Test
    void createUser_teamLeadCanOnlyGrantEmployee() {
        UserPrincipal teamLead = principal(AuthorityLevel.TEAM_LEAD, DEPT_ENGINEERING, TEAM_BACKEND);
        CreateUserRequest request = new CreateUserRequest(
                "newuser", "password123", "New User", null, AuthorityLevel.TEAM_LEAD, null, DEPT_ENGINEERING, TEAM_BACKEND);

        assertThatThrownBy(() -> service.createUser(request, teamLead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void deleteUser_cannotDeleteSelf() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);

        assertThatThrownBy(() -> service.deleteUser(executive.getUserId(), executive))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("own account");
    }

    @Test
    void deleteUser_departmentHeadCannotDeleteExecutive() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);
        Long targetId = 42L;

        UserEntity target = new UserEntity(COMPANY_A, "ceo", "hash", "CEO Person", null);
        setId(target, targetId);
        when(userRepository.findActiveById(targetId)).thenReturn(Optional.of(target));

        PositionEntity targetPosition = new PositionEntity(targetId, AuthorityLevel.EXECUTIVE, null, null, "CEO");
        when(positionRepository.findActiveByUserId(targetId)).thenReturn(Optional.of(targetPosition));

        assertThatThrownBy(() -> service.deleteUser(targetId, deptHead))
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
