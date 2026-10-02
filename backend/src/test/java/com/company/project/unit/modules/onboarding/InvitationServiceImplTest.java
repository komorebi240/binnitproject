package com.company.project.unit.modules.onboarding;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.SecureTokens;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.CompanyEntity;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.CompanyRepository;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.TeamRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.EmailService;
import com.company.project.modules.identity.service.UserManagementService;
import com.company.project.modules.onboarding.domain.InvitationEntity;
import com.company.project.modules.onboarding.domain.InvitationStatus;
import com.company.project.modules.onboarding.dto.request.AcceptInvitationRequest;
import com.company.project.modules.onboarding.dto.request.CreateInvitationRequest;
import com.company.project.modules.onboarding.repository.InvitationRepository;
import com.company.project.modules.onboarding.service.impl.InvitationServiceImpl;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvitationServiceImplTest {

    private static final Long COMPANY = 1L;
    private static final Long INVITER = 5L;
    private static final Long DEPT = 10L;

    @Mock
    private InvitationRepository invitationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CompanyRepository companyRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private PositionRepository positionRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmailService emailService;
    @Mock
    private UserManagementService userManagementService;

    private InvitationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new InvitationServiceImpl(
                invitationRepository, userRepository, companyRepository, departmentRepository, teamRepository,
                positionRepository, passwordEncoder, emailService, userManagementService, "http://app.test/");
    }

    private UserPrincipal principal(AuthorityLevel level, Long userId) {
        return new UserPrincipal(userId, "caller", null, COMPANY, level, level == AuthorityLevel.EXECUTIVE ? null : DEPT, null, true);
    }

    private CreateInvitationRequest request(AuthorityLevel level) {
        return new CreateInvitationRequest(" New.Hire@Acme.test ", level, DEPT, null, " Dev ");
    }

    private InvitationEntity invitation(String token, Instant expiresAt) {
        InvitationEntity i = new InvitationEntity(
                COMPANY, "new.hire@acme.test", AuthorityLevel.EMPLOYEE, DEPT, null, "Dev", INVITER,
                SecureTokens.sha256Hex(token), expiresAt);
        setId(i, 40L);
        return i;
    }

    // ------------------------------------------------------------------ create

    @Test
    void create_failsCleanlyWhenEmailIsNotAvailable() {
        when(emailService.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> service.create(request(AuthorityLevel.EMPLOYEE), principal(AuthorityLevel.EXECUTIVE, INVITER)))
                .isInstanceOf(BusinessException.class);
        verify(invitationRepository, never()).save(any());
    }

    @Test
    void create_aCallerWhoCannotGrantTheLevelCreatesNothing() {
        when(emailService.isConfigured()).thenReturn(true);
        UserPrincipal teamLead = principal(AuthorityLevel.TEAM_LEAD, INVITER);
        when(userManagementService.validateGrantScope(teamLead, AuthorityLevel.DEPARTMENT_HEAD, DEPT, null))
                .thenThrow(new AccessDeniedException("Team leads can only add employees"));

        assertThatThrownBy(() -> service.create(request(AuthorityLevel.DEPARTMENT_HEAD), teamLead))
                .isInstanceOf(AccessDeniedException.class);

        verify(invitationRepository, never()).save(any());
        verify(emailService, never()).sendInvitation(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void create_storesOnlyTheTokenHashAndEmailsTheLinkWithThePlainToken() {
        when(emailService.isConfigured()).thenReturn(true);
        UserPrincipal exec = principal(AuthorityLevel.EXECUTIVE, INVITER);
        when(userManagementService.validateGrantScope(exec, AuthorityLevel.EMPLOYEE, DEPT, null))
                .thenReturn(new UserManagementService.GrantScope(DEPT, null));
        when(invitationRepository.save(any())).thenAnswer(inv -> {
            InvitationEntity i = inv.getArgument(0);
            setId(i, 41L);
            return i;
        });
        CompanyEntity company = new CompanyEntity("Acme");
        when(companyRepository.findActiveById(COMPANY)).thenReturn(Optional.of(company));
        UserEntity inviter = new UserEntity(COMPANY, "boss", "h", "The Boss", null);
        when(userRepository.findById(INVITER)).thenReturn(Optional.of(inviter));

        var response = service.create(request(AuthorityLevel.EMPLOYEE), exec);

        ArgumentCaptor<InvitationEntity> saved = ArgumentCaptor.forClass(InvitationEntity.class);
        verify(invitationRepository).save(saved.capture());
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendInvitation(eq("new.hire@acme.test"), eq("Acme"), eq("The Boss"), link.capture());

        assertThat(link.getValue()).startsWith("http://app.test/invite/").doesNotContain("//invite");
        String token = link.getValue().substring("http://app.test/invite/".length());
        assertThat(SecureTokens.sha256Hex(token)).isEqualTo(tokenHashOf(saved.getValue()));
        assertThat(response.email()).isEqualTo("new.hire@acme.test");
        assertThat(response.title()).isEqualTo("Dev");
    }

    @Test
    void create_replacesAnEarlierPendingInvitationForTheSameAddress() {
        when(emailService.isConfigured()).thenReturn(true);
        UserPrincipal exec = principal(AuthorityLevel.EXECUTIVE, INVITER);
        when(userManagementService.validateGrantScope(any(), any(), any(), any()))
                .thenReturn(new UserManagementService.GrantScope(DEPT, null));
        InvitationEntity earlier = invitation("old", Instant.now().plusSeconds(600));
        when(invitationRepository.findAllByCompanyIdAndEmailIgnoreCaseAndStatus(COMPANY, "new.hire@acme.test", InvitationStatus.PENDING))
                .thenReturn(List.of(earlier));
        when(invitationRepository.save(any())).thenAnswer(inv -> {
            InvitationEntity i = inv.getArgument(0);
            setId(i, 42L);
            return i;
        });

        service.create(request(AuthorityLevel.EMPLOYEE), exec);

        assertThat(earlier.getStatus()).isEqualTo(InvitationStatus.REVOKED);
    }

    // ------------------------------------------------------------------ revoke

    @Test
    void revoke_someoneElsesInvitationIsNotFoundUnlessExecutive() {
        InvitationEntity inv = invitation("t", Instant.now().plusSeconds(600));
        when(invitationRepository.findById(40L)).thenReturn(Optional.of(inv));

        UserPrincipal otherLead = principal(AuthorityLevel.TEAM_LEAD, 99L);
        assertThatThrownBy(() -> service.revoke(40L, otherLead)).isInstanceOf(ResourceNotFoundException.class);
        assertThat(inv.getStatus()).isEqualTo(InvitationStatus.PENDING);

        service.revoke(40L, principal(AuthorityLevel.EXECUTIVE, 99L));
        assertThat(inv.getStatus()).isEqualTo(InvitationStatus.REVOKED);
    }

    @Test
    void revoke_anotherCompanysInvitationIsNotFoundEvenForAnExecutive() {
        InvitationEntity inv = invitation("t", Instant.now().plusSeconds(600));
        when(invitationRepository.findById(40L)).thenReturn(Optional.of(inv));
        UserPrincipal foreignExec = new UserPrincipal(99L, "x", null, 999L, AuthorityLevel.EXECUTIVE, null, null, true);

        assertThatThrownBy(() -> service.revoke(40L, foreignExec)).isInstanceOf(ResourceNotFoundException.class);
    }

    // ------------------------------------------------------------------ resend

    @Test
    void resend_issuesANewLinkAndTheOldTokenStopsMatching() {
        when(emailService.isConfigured()).thenReturn(true);
        InvitationEntity inv = invitation("old-token", Instant.now().plusSeconds(60));
        when(invitationRepository.findById(40L)).thenReturn(Optional.of(inv));
        when(companyRepository.findActiveById(COMPANY)).thenReturn(Optional.of(new CompanyEntity("Acme")));

        service.resend(40L, principal(AuthorityLevel.EXECUTIVE, INVITER));

        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendInvitation(anyString(), anyString(), anyString(), link.capture());
        String newToken = link.getValue().substring(link.getValue().lastIndexOf('/') + 1);
        assertThat(tokenHashOf(inv)).isEqualTo(SecureTokens.sha256Hex(newToken)).isNotEqualTo(SecureTokens.sha256Hex("old-token"));
    }

    @Test
    void resend_onlyForAPendingInvitation() {
        when(emailService.isConfigured()).thenReturn(true);
        InvitationEntity inv = invitation("t", Instant.now().plusSeconds(60));
        inv.revoke();
        when(invitationRepository.findById(40L)).thenReturn(Optional.of(inv));

        assertThatThrownBy(() -> service.resend(40L, principal(AuthorityLevel.EXECUTIVE, INVITER)))
                .isInstanceOf(BusinessException.class);
    }

    // ------------------------------------------------------------------ preview / accept

    @Test
    void preview_unknownRevokedAndExpiredTokensAllLookTheSame() {
        when(invitationRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());
        BusinessException unknown = catchBusiness(() -> service.preview("nope"));

        InvitationEntity revoked = invitation("r", Instant.now().plusSeconds(60));
        revoked.revoke();
        when(invitationRepository.findByTokenHash(SecureTokens.sha256Hex("r"))).thenReturn(Optional.of(revoked));
        BusinessException revokedError = catchBusiness(() -> service.preview("r"));

        InvitationEntity expired = invitation("e", Instant.now().minusSeconds(1));
        when(invitationRepository.findByTokenHash(SecureTokens.sha256Hex("e"))).thenReturn(Optional.of(expired));
        BusinessException expiredError = catchBusiness(() -> service.preview("e"));

        assertThat(unknown.getMessage()).isEqualTo(revokedError.getMessage()).isEqualTo(expiredError.getMessage());
        assertThat(unknown.getStatus().value()).isEqualTo(404);
    }

    @Test
    void preview_showsCompanyAndLevelButNoIds() {
        InvitationEntity inv = invitation("ok", Instant.now().plusSeconds(60));
        when(invitationRepository.findByTokenHash(SecureTokens.sha256Hex("ok"))).thenReturn(Optional.of(inv));
        when(companyRepository.findActiveById(COMPANY)).thenReturn(Optional.of(new CompanyEntity("Acme")));
        when(userRepository.findById(INVITER)).thenReturn(Optional.of(new UserEntity(COMPANY, "boss", "h", "The Boss", null)));

        var preview = service.preview("ok");

        assertThat(preview.companyName()).isEqualTo("Acme");
        assertThat(preview.inviterName()).isEqualTo("The Boss");
        assertThat(preview.authorityLevel()).isEqualTo(AuthorityLevel.EMPLOYEE);
    }

    @Test
    void accept_createsTheUserFromTheInvitationNotFromTheRequest() {
        InvitationEntity inv = invitation("ok", Instant.now().plusSeconds(60));
        when(invitationRepository.findLockedByTokenHash(SecureTokens.sha256Hex("ok"))).thenReturn(Optional.of(inv));
        DepartmentEntity department = new DepartmentEntity(COMPANY, "Eng");
        when(departmentRepository.findActiveById(DEPT)).thenReturn(Optional.of(department));
        when(passwordEncoder.encode("S3cretPass!")).thenReturn("hashed");
        when(userRepository.save(any())).thenAnswer(inv2 -> {
            UserEntity u = inv2.getArgument(0);
            setId(u, 90L);
            return u;
        });

        String username = service.accept("ok", new AcceptInvitationRequest("new.hire", " New Hire ", "S3cretPass!"));

        assertThat(username).isEqualTo("new.hire");
        ArgumentCaptor<UserEntity> user = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(user.capture());
        assertThat(user.getValue().getCompanyId()).isEqualTo(COMPANY);
        assertThat(user.getValue().getEmail()).isEqualTo("new.hire@acme.test");
        assertThat(user.getValue().isOnboardingCompleted()).isFalse();
        ArgumentCaptor<PositionEntity> position = ArgumentCaptor.forClass(PositionEntity.class);
        verify(positionRepository).save(position.capture());
        assertThat(position.getValue().getAuthorityLevel()).isEqualTo(AuthorityLevel.EMPLOYEE);
        assertThat(position.getValue().getDepartmentId()).isEqualTo(DEPT);
        assertThat(inv.getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
    }

    @Test
    void accept_aSecondUseOrAnExpiredInvitationIsRefused() {
        InvitationEntity used = invitation("used", Instant.now().plusSeconds(60));
        used.accept(90L);
        when(invitationRepository.findLockedByTokenHash(SecureTokens.sha256Hex("used"))).thenReturn(Optional.of(used));
        assertThatThrownBy(() -> service.accept("used", new AcceptInvitationRequest("u1", "U", "S3cretPass!")))
                .isInstanceOf(BusinessException.class);

        InvitationEntity expired = invitation("old", Instant.now().minusSeconds(1));
        when(invitationRepository.findLockedByTokenHash(SecureTokens.sha256Hex("old"))).thenReturn(Optional.of(expired));
        assertThatThrownBy(() -> service.accept("old", new AcceptInvitationRequest("u2", "U", "S3cretPass!")))
                .isInstanceOf(BusinessException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void accept_aTakenUsernameIsAConflictAndTheInvitationStaysPending() {
        InvitationEntity inv = invitation("ok", Instant.now().plusSeconds(60));
        when(invitationRepository.findLockedByTokenHash(SecureTokens.sha256Hex("ok"))).thenReturn(Optional.of(inv));
        when(userRepository.existsByUsername("taken")).thenReturn(true);

        assertThatThrownBy(() -> service.accept("ok", new AcceptInvitationRequest("taken", "X", "S3cretPass!")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Username");
        assertThat(inv.getStatus()).isEqualTo(InvitationStatus.PENDING);
    }

    @Test
    void accept_aDepartmentRemovedSinceInvitingIsRefused() {
        InvitationEntity inv = invitation("ok", Instant.now().plusSeconds(60));
        when(invitationRepository.findLockedByTokenHash(SecureTokens.sha256Hex("ok"))).thenReturn(Optional.of(inv));
        when(departmentRepository.findActiveById(DEPT)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.accept("ok", new AcceptInvitationRequest("new.hire", "X", "S3cretPass!")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("no longer exists");
        verify(userRepository, never()).save(any());
    }

    // ------------------------------------------------------------------ helpers

    private interface ThrowingCall {
        void run();
    }

    private static BusinessException catchBusiness(ThrowingCall call) {
        try {
            call.run();
        } catch (BusinessException e) {
            return e;
        }
        throw new AssertionError("expected a BusinessException");
    }

    private static String tokenHashOf(InvitationEntity invitation) {
        try {
            var field = InvitationEntity.class.getDeclaredField("tokenHash");
            field.setAccessible(true);
            return (String) field.get(invitation);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
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
