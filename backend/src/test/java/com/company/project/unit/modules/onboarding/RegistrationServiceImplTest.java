package com.company.project.unit.modules.onboarding;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.SecureTokens;
import com.company.project.common.exception.BusinessException;
import com.company.project.modules.identity.domain.CompanyEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.CompanyRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.EmailService;
import com.company.project.modules.legal.service.TermsService;
import com.company.project.modules.onboarding.domain.RegistrationVerificationEntity;
import com.company.project.modules.onboarding.dto.request.RegisterCompanyRequest;
import com.company.project.modules.onboarding.repository.RegistrationVerificationRepository;
import com.company.project.modules.onboarding.service.impl.RegistrationServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
class RegistrationServiceImplTest {

    private static final String EMAIL = "admin@acme.test";
    private static final int TERMS_VERSION = 1;

    @Mock
    private RegistrationVerificationRepository verificationRepository;
    @Mock
    private CompanyRepository companyRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PositionRepository positionRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmailService emailService;
    @Mock
    private TermsService termsService;

    private RegistrationServiceImpl service;

    /** Configured the way Spring Boot configures it from application.yml (UTF-8, no fallback to the server language). */
    private static MessageSource messages() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        return source;
    }

    @AfterEach
    void resetLocale() {
        LocaleContextHolder.resetLocaleContext();
    }

    @BeforeEach
    void setUp() {
        LocaleContextHolder.setLocale(java.util.Locale.forLanguageTag("vi"));
        service = new RegistrationServiceImpl(
                verificationRepository, companyRepository, userRepository, positionRepository, passwordEncoder, emailService, messages(), termsService);
    }

    private RegistrationVerificationEntity openVerification(String otp, Instant expiresAt) {
        return new RegistrationVerificationEntity(EMAIL, SecureTokens.sha256Hex(otp), expiresAt);
    }

    // ------------------------------------------------------------------ requestOtp

    @Test
    void requestOtp_failsCleanlyWhenEmailIsNotAvailable() {
        when(emailService.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> service.requestOtp(EMAIL))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not available");
        verify(verificationRepository, never()).save(any());
    }

    @Test
    void requestOtp_turnsAwayAnEmailThatAlreadyHasAnAccount() {
        when(emailService.isConfigured()).thenReturn(true);
        UserEntity existing = new UserEntity(1L, "boss", "hash", "Boss", EMAIL);
        when(userRepository.findAllActiveByEmail(EMAIL)).thenReturn(List.of(existing));

        assertThatThrownBy(() -> service.requestOtp("  Admin@ACME.test "))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already belongs");
        verify(verificationRepository, never()).save(any());
        verify(emailService, never()).sendRegistrationOtp(any(), any());
    }

    @Test
    void requestOtp_storesOnlyAHashAndEmailsThePlainCode() {
        when(emailService.isConfigured()).thenReturn(true);

        service.requestOtp("  Admin@ACME.test ");

        ArgumentCaptor<RegistrationVerificationEntity> saved = ArgumentCaptor.forClass(RegistrationVerificationEntity.class);
        verify(verificationRepository).save(saved.capture());
        ArgumentCaptor<String> otp = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendRegistrationOtp(eq(EMAIL), otp.capture());

        assertThat(otp.getValue()).matches("\\d{6}");
        assertThat(saved.getValue().getOtpHash()).isEqualTo(SecureTokens.sha256Hex(otp.getValue())).isNotEqualTo(otp.getValue());
        assertThat(saved.getValue().getEmail()).isEqualTo(EMAIL);
    }

    @Test
    void requestOtp_supersedesEarlierOpenCodes() {
        when(emailService.isConfigured()).thenReturn(true);
        RegistrationVerificationEntity earlier = openVerification("111111", Instant.now().plusSeconds(300));
        when(verificationRepository.findOpenByEmail(EMAIL)).thenReturn(List.of(earlier));

        service.requestOtp(EMAIL);

        assertThat(earlier.isConsumed()).isTrue();
    }

    // ------------------------------------------------------------------ verifyOtp

    @Test
    void verifyOtp_rightCodeReturnsATokenAndStoresOnlyItsHash() {
        RegistrationVerificationEntity verification = openVerification("123456", Instant.now().plusSeconds(300));
        when(verificationRepository.findOpenByEmail(EMAIL)).thenReturn(List.of(verification));

        String token = service.verifyOtp(EMAIL, "123456");

        assertThat(token).isNotBlank();
        assertThat(verification.isVerified()).isTrue();
        // The verification now answers to the token's hash, with a longer window than the OTP had.
        assertThat(verification.getExpiresAt()).isAfter(Instant.now().plus(20, ChronoUnit.MINUTES));
    }

    @Test
    void verifyOtp_wrongCodeCountsAnAttemptAndFails() {
        RegistrationVerificationEntity verification = openVerification("123456", Instant.now().plusSeconds(300));
        when(verificationRepository.findOpenByEmail(EMAIL)).thenReturn(List.of(verification));

        assertThatThrownBy(() -> service.verifyOtp(EMAIL, "000000")).isInstanceOf(BusinessException.class);

        assertThat(verification.getAttempts()).isEqualTo(1);
        assertThat(verification.isVerified()).isFalse();
    }

    @Test
    void verifyOtp_afterFiveFailuresEvenTheRightCodeIsRefused() {
        RegistrationVerificationEntity verification = openVerification("123456", Instant.now().plusSeconds(300));
        when(verificationRepository.findOpenByEmail(EMAIL)).thenReturn(List.of(verification));

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> service.verifyOtp(EMAIL, "000000")).isInstanceOf(BusinessException.class);
        }

        assertThatThrownBy(() -> service.verifyOtp(EMAIL, "123456")).isInstanceOf(BusinessException.class);
        assertThat(verification.isVerified()).isFalse();
    }

    @Test
    void verifyOtp_expiredOrUnknownEmailIsRefused() {
        when(verificationRepository.findOpenByEmail(EMAIL))
                .thenReturn(List.of(openVerification("123456", Instant.now().minusSeconds(1))));
        assertThatThrownBy(() -> service.verifyOtp(EMAIL, "123456")).isInstanceOf(BusinessException.class);

        when(verificationRepository.findOpenByEmail("nobody@x.test")).thenReturn(List.of());
        assertThatThrownBy(() -> service.verifyOtp("nobody@x.test", "123456")).isInstanceOf(BusinessException.class);
    }

    // ------------------------------------------------------------------ register

    private RegisterCompanyRequest registerRequest(String token, String contactEmail) {
        return new RegisterCompanyRequest(token, "  Acme Co ", contactEmail, "acme.admin", " Ann Admin ", "S3cretPass!", TERMS_VERSION);
    }

    private RegistrationVerificationEntity verifiedVerification(String token, Instant expiresAt) {
        RegistrationVerificationEntity v = openVerification("123456", Instant.now().plusSeconds(60));
        v.markVerified(SecureTokens.sha256Hex(token), expiresAt);
        when(verificationRepository.findByTokenHash(SecureTokens.sha256Hex(token))).thenReturn(Optional.of(v));
        return v;
    }

    @Test
    void register_withoutAValidTokenIsRefused() {
        when(verificationRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.register(registerRequest("bogus", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("verification");
        verify(companyRepository, never()).save(any());
    }

    @Test
    void register_anExpiredOrAlreadyUsedTokenIsRefused() {
        verifiedVerification("expired-token", Instant.now().minusSeconds(1));
        assertThatThrownBy(() -> service.register(registerRequest("expired-token", null))).isInstanceOf(BusinessException.class);

        RegistrationVerificationEntity used = verifiedVerification("used-token", Instant.now().plusSeconds(600));
        used.markConsumed();
        assertThatThrownBy(() -> service.register(registerRequest("used-token", null))).isInstanceOf(BusinessException.class);

        verify(companyRepository, never()).save(any());
    }

    @Test
    void register_aTakenUsernameIsAConflictAndCreatesNothing() {
        verifiedVerification("good-token", Instant.now().plusSeconds(600));
        when(userRepository.existsByUsername("acme.admin")).thenReturn(true);

        assertThatThrownBy(() -> service.register(registerRequest("good-token", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Username");
        verify(companyRepository, never()).save(any());
    }

    @Test
    void register_createsTheCompanyAndAnExecutiveUsingTheVerifiedEmail() {
        RegistrationVerificationEntity v = verifiedVerification("good-token", Instant.now().plusSeconds(600));
        when(passwordEncoder.encode("S3cretPass!")).thenReturn("hashed");
        when(companyRepository.save(any())).thenAnswer(inv -> {
            CompanyEntity c = inv.getArgument(0);
            setId(c, 7L);
            return c;
        });
        when(userRepository.save(any())).thenAnswer(inv -> {
            UserEntity u = inv.getArgument(0);
            setId(u, 70L);
            return u;
        });

        String username = service.register(registerRequest("good-token", null));

        assertThat(username).isEqualTo("acme.admin");
        ArgumentCaptor<CompanyEntity> company = ArgumentCaptor.forClass(CompanyEntity.class);
        verify(companyRepository).save(company.capture());
        assertThat(company.getValue().getName()).isEqualTo("Acme Co");
        assertThat(company.getValue().getContactEmail()).isEqualTo(EMAIL);

        ArgumentCaptor<UserEntity> user = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(user.capture());
        assertThat(user.getValue().getEmail()).isEqualTo(EMAIL);
        assertThat(user.getValue().getCompanyId()).isEqualTo(7L);
        assertThat(user.getValue().getPasswordHash()).isEqualTo("hashed");
        assertThat(user.getValue().isOnboardingCompleted()).isFalse();

        ArgumentCaptor<PositionEntity> position = ArgumentCaptor.forClass(PositionEntity.class);
        verify(positionRepository).save(position.capture());
        assertThat(position.getValue().getAuthorityLevel()).isEqualTo(AuthorityLevel.EXECUTIVE);
        assertThat(position.getValue().getTitle()).isEqualTo("Quản trị viên");
        verify(termsService).recordAcceptance(70L, TERMS_VERSION);
        assertThat(v.isConsumed()).isTrue();
    }

    @Test
    void register_withoutTheCurrentTermsNothingIsCreated() {
        org.mockito.Mockito.doThrow(new BusinessException("TERMS_VERSION_MISMATCH", "The terms have changed", org.springframework.http.HttpStatus.CONFLICT))
                .when(termsService).requireCurrentVersion(TERMS_VERSION);

        assertThatThrownBy(() -> service.register(registerRequest("good-token", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("terms");

        verify(companyRepository, never()).save(any());
        verify(userRepository, never()).save(any());
        verify(termsService, never()).recordAcceptance(any(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void register_titlesTheFirstAdministratorInTheLanguageOfTheRequest() {
        LocaleContextHolder.setLocale(java.util.Locale.ENGLISH);
        verifiedVerification("good-token", Instant.now().plusSeconds(600));
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(companyRepository.save(any())).thenAnswer(inv -> {
            CompanyEntity c = inv.getArgument(0);
            setId(c, 7L);
            return c;
        });
        when(userRepository.save(any())).thenAnswer(inv -> {
            UserEntity u = inv.getArgument(0);
            setId(u, 70L);
            return u;
        });

        service.register(registerRequest("good-token", null));

        ArgumentCaptor<PositionEntity> position = ArgumentCaptor.forClass(PositionEntity.class);
        verify(positionRepository).save(position.capture());
        assertThat(position.getValue().getTitle()).isEqualTo("Administrator");
    }

    @Test
    void register_usesAnExplicitContactEmailWhenGiven() {
        verifiedVerification("good-token", Instant.now().plusSeconds(600));
        when(companyRepository.save(any())).thenAnswer(inv -> {
            CompanyEntity c = inv.getArgument(0);
            setId(c, 7L);
            return c;
        });
        when(userRepository.save(any())).thenAnswer(inv -> {
            UserEntity u = inv.getArgument(0);
            setId(u, 70L);
            return u;
        });

        service.register(registerRequest("good-token", " Hello@Acme.test "));

        ArgumentCaptor<CompanyEntity> company = ArgumentCaptor.forClass(CompanyEntity.class);
        verify(companyRepository).save(company.capture());
        assertThat(company.getValue().getContactEmail()).isEqualTo("hello@acme.test");
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
