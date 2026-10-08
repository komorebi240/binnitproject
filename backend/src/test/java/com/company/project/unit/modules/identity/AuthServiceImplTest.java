package com.company.project.unit.modules.identity;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.RateLimitGuard;
import com.company.project.common.exception.BusinessException;
import com.company.project.modules.identity.domain.PasswordResetOtpEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.CompanyRepository;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PasswordResetOtpRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.TeamRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.AvatarStorageService;
import com.company.project.modules.identity.service.EmailService;
import com.company.project.modules.identity.service.LoginProtectionService;
import com.company.project.modules.identity.service.SessionService;
import com.company.project.modules.legal.service.TermsService;
import com.company.project.modules.identity.service.impl.AuthServiceImpl;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the Phase 4 password-change / forgot-password rules - in particular the
 * never-leak-account-existence contract (CLAUDE.md section 13) that requestPasswordReset must
 * hold both when the email feature is unavailable and when the username doesn't exist.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    private static final Long COMPANY_A = 1L;

    @Mock
    private AuthenticationManager authenticationManager;
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
    private PasswordResetOtpRepository passwordResetOtpRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmailService emailService;
    @Mock
    private SessionService sessionService;
    @Mock
    private LoginProtectionService loginProtectionService;
    @Mock
    private AvatarStorageService avatarStorageService;
    @Mock
    private TermsService termsService;

    private AuthServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AuthServiceImpl(
                authenticationManager, userRepository, companyRepository, departmentRepository,
                teamRepository, positionRepository, passwordResetOtpRepository, passwordEncoder, sessionService, loginProtectionService, emailService,
                avatarStorageService, termsService);
    }

    private UserPrincipal principal(Long userId) {
        return new UserPrincipal(userId, "caller", null, COMPANY_A, AuthorityLevel.EMPLOYEE, null, null, true);
    }

    @Test
    void changePassword_wrongCurrentPasswordIsRejected() {
        UserEntity user = new UserEntity(COMPANY_A, "caller", "hashed-old", "Caller", "caller@example.local");
        setId(user, 1L);
        when(userRepository.findActiveById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed-old")).thenReturn(false);

        assertThatThrownBy(() -> service.changePassword(principal(1L), "wrong", "newpassword123", "this-browser"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Current password");
        org.mockito.Mockito.verifyNoInteractions(sessionService);
    }

    @Test
    void changePassword_correctCurrentPasswordUpdatesHash() {
        UserEntity user = new UserEntity(COMPANY_A, "caller", "hashed-old", "Caller", "caller@example.local");
        setId(user, 1L);
        when(userRepository.findActiveById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("old", "hashed-old")).thenReturn(true);
        when(passwordEncoder.encode("newpassword123")).thenReturn("hashed-new");

        service.changePassword(principal(1L), "old", "newpassword123", "this-browser");

        assertThat(user.getPasswordHash()).isEqualTo("hashed-new");
        // Other devices are signed out, the browser that made the change stays signed in.
        verify(sessionService).endOthers(1L, "this-browser");
    }

    @Test
    void authenticate_aBlockedUsernameOrAddressIsRefusedBeforeThePasswordIsChecked() {
        org.mockito.Mockito.doThrow(RateLimitGuard.tooManyRequests())
                .when(loginProtectionService).checkAllowed("caller", "203.0.113.7");

        assertThatThrownBy(() -> service.authenticate("caller", "any-password", "203.0.113.7"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Too many attempts. Please try again later.");
        org.mockito.Mockito.verifyNoInteractions(authenticationManager);
        verify(loginProtectionService, org.mockito.Mockito.never()).recordFailure(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void authenticate_aWrongPasswordIsCountedAndStaysAPlain401() {
        when(authenticationManager.authenticate(org.mockito.ArgumentMatchers.any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> service.authenticate("caller", "wrong", "203.0.113.7"))
                .isInstanceOf(BadCredentialsException.class);
        verify(loginProtectionService).recordFailure("caller", "203.0.113.7");
        verify(loginProtectionService, org.mockito.Mockito.never()).clearFailures(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void authenticate_successClearsTheUsernamesFailures() {
        UserPrincipal caller = principal(1L);
        when(authenticationManager.authenticate(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new UsernamePasswordAuthenticationToken(caller, null, caller.getAuthorities()));

        assertThat(service.authenticate("caller", "right", "203.0.113.7")).isSameAs(caller);
        verify(loginProtectionService).checkAllowed("caller", "203.0.113.7");
        verify(loginProtectionService).clearFailures("caller");
        verify(loginProtectionService, org.mockito.Mockito.never()).recordFailure(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void requestPasswordReset_emailNotConfiguredFailsBeforeAnyUserLookup() {
        when(emailService.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> service.requestPasswordReset("anyone"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not available");

        // The whole point of checking isConfigured() first is that this response is identical
        // for a real username and a fake one - verified by never even touching userRepository.
        org.mockito.Mockito.verifyNoInteractions(userRepository);
    }

    @Test
    void requestPasswordReset_unknownUsernameDoesNothingButDoesNotThrow() {
        when(emailService.isConfigured()).thenReturn(true);
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        service.requestPasswordReset("ghost");

        org.mockito.Mockito.verify(emailService, org.mockito.Mockito.never())
                .sendPasswordResetOtp(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void requestPasswordReset_knownUsernameSendsOtpToTheirEmail() {
        UserEntity user = new UserEntity(COMPANY_A, "caller", "hashed", "Caller", "caller@example.local");
        setId(user, 1L);
        when(emailService.isConfigured()).thenReturn(true);
        when(userRepository.findByUsername("caller")).thenReturn(Optional.of(user));
        when(passwordResetOtpRepository.findAllUnusedByUserId(1L)).thenReturn(List.of());

        service.requestPasswordReset("caller");

        verify(emailService).sendPasswordResetOtp(org.mockito.ArgumentMatchers.eq("caller@example.local"),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void requestPasswordReset_acceptsTheAccountEmailInPlaceOfTheUsername() {
        UserEntity user = new UserEntity(COMPANY_A, "caller", "hashed", "Caller", "caller@example.local");
        setId(user, 1L);
        when(emailService.isConfigured()).thenReturn(true);
        when(userRepository.findAllActiveByEmail("caller@example.local")).thenReturn(List.of(user));
        when(passwordResetOtpRepository.findAllUnusedByUserId(1L)).thenReturn(List.of());

        service.requestPasswordReset("  Caller@Example.local ");

        verify(emailService).sendPasswordResetOtp(org.mockito.ArgumentMatchers.eq("caller@example.local"),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void requestPasswordReset_anEmailSharedByTwoAccountsSendsNothing() {
        UserEntity first = new UserEntity(COMPANY_A, "one", "hashed", "One", "same@example.local");
        UserEntity second = new UserEntity(COMPANY_A, "two", "hashed", "Two", "same@example.local");
        when(emailService.isConfigured()).thenReturn(true);
        when(userRepository.findAllActiveByEmail("same@example.local")).thenReturn(List.of(first, second));

        service.requestPasswordReset("same@example.local");

        org.mockito.Mockito.verify(emailService, org.mockito.Mockito.never())
                .sendPasswordResetOtp(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void confirmPasswordReset_wrongOtpIsRejected() {
        UserEntity user = new UserEntity(COMPANY_A, "caller", "hashed-old", "Caller", "caller@example.local");
        setId(user, 1L);
        when(userRepository.findByUsername("caller")).thenReturn(Optional.of(user));
        when(passwordResetOtpRepository.findAllUnusedByUserId(1L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.confirmPasswordReset("caller", "000000", "newpassword123"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("invalid, expired");
    }

    @Test
    void confirmPasswordReset_expiredOtpIsRejected() {
        UserEntity user = new UserEntity(COMPANY_A, "caller", "hashed-old", "Caller", "caller@example.local");
        setId(user, 1L);
        when(userRepository.findByUsername("caller")).thenReturn(Optional.of(user));

        // Same hashing scheme AuthServiceImpl uses internally (SHA-256 hex) - this test knows
        // the implementation detail only well enough to construct an already-expired row.
        PasswordResetOtpEntity expired = new PasswordResetOtpEntity(1L, sha256Hex("123456"), Instant.now().minus(1, ChronoUnit.MINUTES));
        when(passwordResetOtpRepository.findAllUnusedByUserId(1L)).thenReturn(List.of(expired));

        assertThatThrownBy(() -> service.confirmPasswordReset("caller", "123456", "newpassword123"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("invalid, expired");
    }

    @Test
    void confirmPasswordReset_validOtpUpdatesPasswordAndMarksUsed() {
        UserEntity user = new UserEntity(COMPANY_A, "caller", "hashed-old", "Caller", "caller@example.local");
        setId(user, 1L);
        when(userRepository.findByUsername("caller")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("newpassword123")).thenReturn("hashed-new");

        PasswordResetOtpEntity valid = new PasswordResetOtpEntity(1L, sha256Hex("123456"), Instant.now().plus(5, ChronoUnit.MINUTES));
        when(passwordResetOtpRepository.findAllUnusedByUserId(1L)).thenReturn(List.of(valid));

        service.confirmPasswordReset("caller", "123456", "newpassword123");

        assertThat(user.getPasswordHash()).isEqualTo("hashed-new");
        assertThat(valid.isUsed()).isTrue();
        // Someone who forgot the password may be locked out because someone else has it: every session ends.
        verify(sessionService).endAll(1L);
        // ...and a sign-in block caused by someone else's guessing is lifted.
        verify(loginProtectionService).clearFailures("caller");
    }

    private static String sha256Hex(String value) {
        try {
            var digest = java.security.MessageDigest.getInstance("SHA-256");
            return java.util.HexFormat.of().formatHex(digest.digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
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
