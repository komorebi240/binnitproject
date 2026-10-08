package com.company.project.unit.modules.identity;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.exception.BusinessException;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.dto.request.CreateUserRequest;
import com.company.project.modules.identity.dto.request.UpdatePositionRequest;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.TeamRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.AvatarStorageService;
import com.company.project.modules.identity.service.impl.UserManagementServiceImpl;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import com.company.project.common.SecureTokens;
import com.company.project.modules.identity.domain.EmailChangeRequestEntity;
import com.company.project.modules.identity.repository.EmailChangeRequestRepository;
import com.company.project.modules.identity.service.AuthService;
import com.company.project.modules.identity.service.EmailService;
import com.company.project.modules.identity.service.SessionService;
import java.time.Instant;
import java.util.List;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the hierarchy rules from the Phase 1 plan that a manual curl/browser session already
 * exercised once (see backend/README.md "Verified") - turning that into fast, repeatable
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
    @Mock
    private AvatarStorageService avatarStorageService;
    @Mock
    private AuthService authService;
    @Mock
    private EmailService emailService;
    @Mock
    private EmailChangeRequestRepository emailChangeRepository;
    @Mock
    private SessionService sessionService;

    private UserManagementServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new UserManagementServiceImpl(
                userRepository, positionRepository, departmentRepository, teamRepository, passwordEncoder,
                avatarStorageService, authService, emailService, emailChangeRepository, sessionService);
    }

    private UserPrincipal principal(AuthorityLevel level, Long departmentId, Long teamId) {
        return new UserPrincipal(1L, "caller", null, COMPANY_A, level, departmentId, teamId, true);
    }

    @Test
    void createUser_departmentHeadCannotGrantExecutive() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);
        CreateUserRequest request = new CreateUserRequest(
                "newuser", "password123", "New User", null, AuthorityLevel.EXECUTIVE, null, null, null, null, null, null);

        assertThatThrownBy(() -> service.createUser(request, deptHead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void createUser_departmentHeadCannotGrantInDifferentDepartment() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);
        CreateUserRequest request = new CreateUserRequest(
                "newuser", "password123", "New User", null, AuthorityLevel.EMPLOYEE, null, DEPT_SALES, null, null, null, null);

        assertThatThrownBy(() -> service.createUser(request, deptHead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void createUser_departmentHeadCanGrantEmployeeInOwnDepartment() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);
        CreateUserRequest request = new CreateUserRequest(
                "newuser", "password123", "New User", null, AuthorityLevel.EMPLOYEE, null, DEPT_ENGINEERING, null, null, null, null);

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
                "newuser", "password123", "New User", null, AuthorityLevel.TEAM_LEAD, null, DEPT_ENGINEERING, TEAM_BACKEND, null, null, null);

        assertThatThrownBy(() -> service.createUser(request, teamLead))
                .isInstanceOf(AccessDeniedException.class);
    }

    /** The caller re-enters their own password; stub the lookup + match so the rules after it can be tested. */
    private void callerKnowsPassword(UserPrincipal caller, boolean matches) {
        UserEntity callerUser = new UserEntity(COMPANY_A, "caller", "stored-hash", "Caller", null);
        setId(callerUser, caller.getUserId());
        when(userRepository.findActiveById(caller.getUserId())).thenReturn(Optional.of(callerUser));
        when(passwordEncoder.matches("right-password", "stored-hash")).thenReturn(matches);
    }

    @Test
    void deleteUser_wrongPasswordIsRefusedBeforeAnythingElseHappens() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        callerKnowsPassword(executive, false);

        assertThatThrownBy(() -> service.deleteUser(42L, "right-password", executive))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("password is incorrect");
        verify(positionRepository, never()).findActiveByUserId(42L);
    }

    @Test
    void deleteUser_correctPasswordDeletesTheUserAndClosesTheirPosition() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        callerKnowsPassword(executive, true);
        UserEntity target = new UserEntity(COMPANY_A, "leaver", "hash", "Leaver", null);
        setId(target, 42L);
        when(userRepository.findActiveById(42L)).thenReturn(Optional.of(target));
        PositionEntity position = new PositionEntity(42L, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null, null);
        when(positionRepository.findActiveByUserId(42L)).thenReturn(Optional.of(position));

        service.deleteUser(42L, "right-password", executive);

        assertThat(target.isDeleted()).isTrue();
        assertThat(position.isDeleted()).isTrue();
        verify(sessionService).endAll(42L);
    }

    @Test
    void deleteUser_cannotDeleteSelf() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        callerKnowsPassword(executive, true);

        assertThatThrownBy(() -> service.deleteUser(executive.getUserId(), "right-password", executive))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("own account");
    }

    @Test
    void deleteUser_departmentHeadCannotDeleteExecutive() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);
        callerKnowsPassword(deptHead, true);
        Long targetId = 42L;

        UserEntity target = new UserEntity(COMPANY_A, "ceo", "hash", "CEO Person", null);
        setId(target, targetId);
        when(userRepository.findActiveById(targetId)).thenReturn(Optional.of(target));

        PositionEntity targetPosition = new PositionEntity(targetId, AuthorityLevel.EXECUTIVE, null, null, "CEO");
        when(positionRepository.findActiveByUserId(targetId)).thenReturn(Optional.of(targetPosition));

        assertThatThrownBy(() -> service.deleteUser(targetId, "right-password", deptHead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void setActive_deactivatingEndsEverySessionOfTheAccount() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        UserEntity target = new UserEntity(COMPANY_A, "member", "hash", "Member", null);
        setId(target, 42L);
        when(userRepository.findActiveById(42L)).thenReturn(Optional.of(target));
        when(positionRepository.findActiveByUserId(42L))
                .thenReturn(Optional.of(new PositionEntity(42L, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null, null)));

        service.setActive(42L, false, executive);

        assertThat(target.isActive()).isFalse();
        verify(sessionService).endAll(42L);
    }

    @Test
    void setActive_reactivatingLeavesSessionsAlone() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        UserEntity target = new UserEntity(COMPANY_A, "member", "hash", "Member", null);
        setId(target, 42L);
        target.setActive(false);
        when(userRepository.findActiveById(42L)).thenReturn(Optional.of(target));
        when(positionRepository.findActiveByUserId(42L))
                .thenReturn(Optional.of(new PositionEntity(42L, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null, null)));

        service.setActive(42L, true, executive);

        assertThat(target.isActive()).isTrue();
        verify(sessionService, never()).endAll(42L);
    }

    @Test
    void setActive_cannotDeactivateSelf() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);

        assertThatThrownBy(() -> service.setActive(executive.getUserId(), false, executive))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("own account status");
    }

    @Test
    void setActive_crossCompanyTargetIsNotFound() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        Long targetId = 42L;

        UserEntity target = new UserEntity(999L, "other-company-user", "hash", "Someone Else", null);
        setId(target, targetId);
        when(userRepository.findActiveById(targetId)).thenReturn(Optional.of(target));

        assertThatThrownBy(() -> service.setActive(targetId, false, executive))
                .isInstanceOf(com.company.project.common.exception.ResourceNotFoundException.class);
    }

    @Test
    void updatePosition_teamLeadCannotPromoteToDepartmentHead() {
        UserPrincipal teamLead = principal(AuthorityLevel.TEAM_LEAD, DEPT_ENGINEERING, TEAM_BACKEND);
        Long targetId = 42L;

        UserEntity target = new UserEntity(COMPANY_A, "employee", "hash", "Employee Person", null);
        setId(target, targetId);
        when(userRepository.findActiveById(targetId)).thenReturn(Optional.of(target));

        PositionEntity targetPosition =
                new PositionEntity(targetId, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, TEAM_BACKEND, null);
        when(positionRepository.findActiveByUserId(targetId)).thenReturn(Optional.of(targetPosition));

        UpdatePositionRequest request =
                new UpdatePositionRequest(AuthorityLevel.DEPARTMENT_HEAD, null, DEPT_ENGINEERING, null);

        assertThatThrownBy(() -> service.updatePosition(targetId, request, teamLead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void updatePosition_executiveTransfersEmployeeAndClosesOldPosition() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        Long targetId = 42L;

        UserEntity target = new UserEntity(COMPANY_A, "employee", "hash", "Employee Person", null);
        setId(target, targetId);
        when(userRepository.findActiveById(targetId)).thenReturn(Optional.of(target));

        PositionEntity oldPosition =
                new PositionEntity(targetId, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null, null);
        when(positionRepository.findActiveByUserId(targetId)).thenReturn(Optional.of(oldPosition));
        when(positionRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        DepartmentEntity salesDept = new DepartmentEntity(COMPANY_A, "Sales");
        setId(salesDept, DEPT_SALES);
        when(departmentRepository.findActiveById(DEPT_SALES)).thenReturn(Optional.of(salesDept));
        when(positionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdatePositionRequest request =
                new UpdatePositionRequest(AuthorityLevel.DEPARTMENT_HEAD, "Truong phong", DEPT_SALES, null);

        var response = service.updatePosition(targetId, request, executive);

        assertThat(oldPosition.isDeleted()).isTrue();
        assertThat(response.authorityLevel()).isEqualTo(AuthorityLevel.DEPARTMENT_HEAD);
        assertThat(response.departmentId()).isEqualTo(DEPT_SALES);
    }


    // ---- staff account recovery (password reset by email, confirmed email change) ----

    private UserEntity staff(Long id, String email) {
        UserEntity user = new UserEntity(COMPANY_A, "staff" + id, "hash", "Staff " + id, email);
        setId(user, id);
        when(userRepository.findActiveById(id)).thenReturn(Optional.of(user));
        when(positionRepository.findActiveByUserId(id))
                .thenReturn(Optional.of(new PositionEntity(id, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null, null)));
        return user;
    }

    @Test
    void sendPasswordReset_startsTheEmailResetFlowForTheTarget() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        staff(42L, "staff@example.com");

        service.sendPasswordReset(42L, executive);

        verify(authService).requestPasswordReset("staff42");
    }

    @Test
    void sendPasswordReset_refusesAUserWithoutAnEmail() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        staff(42L, null);

        assertThatThrownBy(() -> service.sendPasswordReset(42L, executive))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("no email");
        verify(authService, never()).requestPasswordReset(any());
    }

    @Test
    void sendPasswordReset_cannotTargetYourself() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);

        assertThatThrownBy(() -> service.sendPasswordReset(executive.getUserId(), executive))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("own settings");
    }

    @Test
    void sendPasswordReset_departmentHeadCannotTouchAnotherDepartment() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_SALES, null);
        staff(42L, "staff@example.com");

        assertThatThrownBy(() -> service.sendPasswordReset(42L, deptHead))
                .isInstanceOf(AccessDeniedException.class);
        verify(authService, never()).requestPasswordReset(any());
    }

    @Test
    void requestEmailChange_sendsTheCodeToTheNewAddressOnly() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        UserEntity target = staff(42L, "old@example.com");
        when(emailService.isConfigured()).thenReturn(true);
        when(emailChangeRepository.findOpenByUserId(42L)).thenReturn(List.of());

        service.requestEmailChange(42L, " New@Example.com ", executive);

        verify(emailService).sendEmailChangeOtp(org.mockito.ArgumentMatchers.eq("new@example.com"), any());
        assertThat(target.getEmail()).isEqualTo("old@example.com");
    }

    @Test
    void requestEmailChange_rejectsTheSameEmail() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        staff(42L, "same@example.com");

        assertThatThrownBy(() -> service.requestEmailChange(42L, "SAME@example.com", executive))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already");
    }

    @Test
    void confirmEmailChange_rightCodeChangesTheEmailAndWarnsTheOldAddress() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        UserEntity target = staff(42L, "old@example.com");
        EmailChangeRequestEntity pending = new EmailChangeRequestEntity(
                42L, "new@example.com", SecureTokens.sha256Hex("123456"), Instant.now().plusSeconds(600), 1L);
        when(emailChangeRepository.findOpenByUserId(42L)).thenReturn(List.of(pending));

        service.confirmEmailChange(42L, "123456", executive);

        assertThat(target.getEmail()).isEqualTo("new@example.com");
        verify(emailService).sendEmailChangedNotice("old@example.com", "new@example.com");
    }

    @Test
    void confirmEmailChange_wrongCodeCountsAnAttemptAndKeepsTheOldEmail() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        UserEntity target = staff(42L, "old@example.com");
        EmailChangeRequestEntity pending = new EmailChangeRequestEntity(
                42L, "new@example.com", SecureTokens.sha256Hex("123456"), Instant.now().plusSeconds(600), 1L);
        when(emailChangeRepository.findOpenByUserId(42L)).thenReturn(List.of(pending));

        assertThatThrownBy(() -> service.confirmEmailChange(42L, "000000", executive))
                .isInstanceOf(BusinessException.class);

        assertThat(pending.getAttempts()).isEqualTo(1);
        assertThat(target.getEmail()).isEqualTo("old@example.com");
    }

    @Test
    void confirmEmailChange_expiredOrExhaustedCodeIsRejectedEvenIfRight() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        UserEntity target = staff(42L, "old@example.com");
        EmailChangeRequestEntity expired = new EmailChangeRequestEntity(
                42L, "new@example.com", SecureTokens.sha256Hex("123456"), Instant.now().minusSeconds(1), 1L);
        when(emailChangeRepository.findOpenByUserId(42L)).thenReturn(List.of(expired));

        assertThatThrownBy(() -> service.confirmEmailChange(42L, "123456", executive))
                .isInstanceOf(BusinessException.class);
        assertThat(target.getEmail()).isEqualTo("old@example.com");

        EmailChangeRequestEntity exhausted = new EmailChangeRequestEntity(
                42L, "new@example.com", SecureTokens.sha256Hex("123456"), Instant.now().plusSeconds(600), 1L);
        for (int i = 0; i < 5; i++) {
            exhausted.recordFailedAttempt();
        }
        when(emailChangeRepository.findOpenByUserId(42L)).thenReturn(List.of(exhausted));

        assertThatThrownBy(() -> service.confirmEmailChange(42L, "123456", executive))
                .isInstanceOf(BusinessException.class);
        assertThat(target.getEmail()).isEqualTo("old@example.com");
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
