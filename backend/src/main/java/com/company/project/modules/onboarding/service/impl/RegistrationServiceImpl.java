package com.company.project.modules.onboarding.service.impl;

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
import com.company.project.modules.onboarding.domain.RegistrationVerificationEntity;
import com.company.project.modules.onboarding.dto.request.RegisterCompanyRequest;
import com.company.project.modules.onboarding.repository.RegistrationVerificationRepository;
import com.company.project.modules.onboarding.service.RegistrationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

@Service
public class RegistrationServiceImpl implements RegistrationService {

    private static final int OTP_DIGITS = 6;
    private static final int OTP_TTL_MINUTES = 10;
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final int TOKEN_TTL_MINUTES = 30;
    private static final String ADMIN_TITLE = "Quản trị viên";

    private final RegistrationVerificationRepository verificationRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final PositionRepository positionRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public RegistrationServiceImpl(
            RegistrationVerificationRepository verificationRepository,
            CompanyRepository companyRepository,
            UserRepository userRepository,
            PositionRepository positionRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService) {
        this.verificationRepository = verificationRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.positionRepository = positionRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @Override
    @Transactional
    public void requestOtp(String email) {
        if (!emailService.isConfigured()) {
            // Checked before anything else so the response never depends on the address.
            throw new BusinessException(
                    "EMAIL_SERVICE_UNAVAILABLE", "Registration by email is not available right now", HttpStatus.SERVICE_UNAVAILABLE);
        }
        String normalized = normalize(email);

        // Only the newest code is ever valid.
        verificationRepository.findOpenByEmail(normalized).forEach(RegistrationVerificationEntity::markConsumed);

        String otp = SecureTokens.randomNumericCode(OTP_DIGITS);
        verificationRepository.save(new RegistrationVerificationEntity(
                normalized, SecureTokens.sha256Hex(otp), Instant.now().plus(OTP_TTL_MINUTES, ChronoUnit.MINUTES)));
        emailService.sendRegistrationOtp(normalized, otp);
    }

    /**
     * {@code noRollbackFor}: a wrong code throws, but the failed-attempt counter must still be saved -
     * otherwise the attempt limit would reset itself on every failure.
     */
    @Override
    @Transactional(noRollbackFor = BusinessException.class)
    public String verifyOtp(String email, String otp) {
        Instant now = Instant.now();
        RegistrationVerificationEntity verification = verificationRepository.findOpenByEmail(normalize(email)).stream()
                .findFirst()
                .orElseThrow(RegistrationServiceImpl::invalidOtp);

        if (!verification.getExpiresAt().isAfter(now) || verification.getAttempts() >= MAX_OTP_ATTEMPTS) {
            throw invalidOtp();
        }
        if (!constantTimeEquals(verification.getOtpHash(), SecureTokens.sha256Hex(otp))) {
            verification.recordFailedAttempt();
            throw invalidOtp();
        }

        String token = SecureTokens.randomUrlSafeToken();
        verification.markVerified(SecureTokens.sha256Hex(token), now.plus(TOKEN_TTL_MINUTES, ChronoUnit.MINUTES));
        return token;
    }

    @Override
    @Transactional
    public String register(RegisterCompanyRequest request) {
        RegistrationVerificationEntity verification = verificationRepository
                .findByTokenHash(SecureTokens.sha256Hex(request.verificationToken()))
                .filter(v -> v.isVerified() && !v.isConsumed() && v.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new BusinessException(
                        "INVALID_VERIFICATION",
                        "The email verification is invalid or has expired - please verify your email again",
                        HttpStatus.UNPROCESSABLE_ENTITY));

        if (userRepository.existsByUsername(request.username())) {
            throw new BusinessException("USERNAME_TAKEN", "Username is already in use", HttpStatus.CONFLICT);
        }

        String adminEmail = verification.getEmail();
        CompanyEntity company = new CompanyEntity(request.companyName().trim());
        company.setContactEmail(request.contactEmail() == null || request.contactEmail().isBlank()
                ? adminEmail
                : normalize(request.contactEmail()));
        CompanyEntity savedCompany = companyRepository.save(company);

        UserEntity admin = userRepository.save(new UserEntity(
                savedCompany.getId(),
                request.username(),
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                adminEmail));
        positionRepository.save(new PositionEntity(admin.getId(), AuthorityLevel.EXECUTIVE, null, null, ADMIN_TITLE));

        verification.markConsumed();
        return admin.getUsername();
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private static BusinessException invalidOtp() {
        return new BusinessException(
                "INVALID_OTP", "The code is invalid, expired, or has been tried too many times", HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
