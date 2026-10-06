package com.company.project.modules.identity.service.impl;

import com.company.project.common.PresenceStatus;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.CompanyEntity;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PasswordResetOtpEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.TeamEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.dto.request.UpdateProfileRequest;
import com.company.project.modules.identity.dto.response.UserProfileResponse;
import com.company.project.modules.identity.repository.CompanyRepository;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PasswordResetOtpRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.TeamRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.AuthService;
import com.company.project.modules.identity.service.AvatarStorageService;
import com.company.project.modules.identity.service.EmailService;
import com.company.project.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);
    private static final int OTP_LENGTH = 6;
    private static final int OTP_TTL_MINUTES = 10;

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final PositionRepository positionRepository;
    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AvatarStorageService avatarStorageService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthServiceImpl(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            CompanyRepository companyRepository,
            DepartmentRepository departmentRepository,
            TeamRepository teamRepository,
            PositionRepository positionRepository,
            PasswordResetOtpRepository passwordResetOtpRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            AvatarStorageService avatarStorageService
    ) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.departmentRepository = departmentRepository;
        this.teamRepository = teamRepository;
        this.positionRepository = positionRepository;
        this.passwordResetOtpRepository = passwordResetOtpRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.avatarStorageService = avatarStorageService;
    }

    @Override
    public UserPrincipal authenticate(String username, String password) {
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password));
        return (UserPrincipal) authentication.getPrincipal();
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UserPrincipal principal) {
        UserEntity user = userRepository.findActiveById(principal.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUserId()));
        CompanyEntity company = companyRepository.findActiveById(principal.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", principal.getCompanyId()));
        PositionEntity position = positionRepository.findActiveByUserId(principal.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUserId()));

        String departmentName = principal.getDepartmentId() == null ? null
                : departmentRepository.findActiveById(principal.getDepartmentId())
                        .map(DepartmentEntity::getName).orElse(null);
        String teamName = principal.getTeamId() == null ? null
                : teamRepository.findActiveById(principal.getTeamId())
                        .map(TeamEntity::getName).orElse(null);

        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                company.getId(),
                company.getName(),
                principal.getAuthorityLevel(),
                position.getTitle(),
                principal.getDepartmentId(),
                departmentName,
                principal.getTeamId(),
                teamName,
                avatarUrl(user),
                user.getPresenceStatus(),
                user.isSystemAccount(),
                user.isOnboardingCompleted());
    }

    private String avatarUrl(UserEntity user) {
        return user.getAvatarPath() == null ? null : "/users/" + user.getId() + "/avatar";
    }

    @Override
    @Transactional
    public void changePassword(UserPrincipal caller, String currentPassword, String newPassword) {
        UserEntity user = userRepository.findActiveById(caller.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", caller.getUserId()));

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BusinessException(
                    "INVALID_CURRENT_PASSWORD", "Current password is incorrect", HttpStatus.UNAUTHORIZED);
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
    }

    @Override
    @Transactional
    public UserProfileResponse updateProfile(UserPrincipal caller, UpdateProfileRequest request) {
        UserEntity user = userRepository.findActiveById(caller.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", caller.getUserId()));

        user.setEmail(request.email());
        user.setPhone(request.phone());

        return getProfile(caller);
    }

    @Override
    @Transactional
    public void requestPasswordReset(String username) {
        if (!emailService.isConfigured()) {
            // Checked before any user lookup so the response is identical for every username -
            // this never leaks whether the account exists (CLAUDE.md section 13).
            throw new BusinessException(
                    "EMAIL_SERVICE_UNAVAILABLE",
                    "Password reset by email is not available right now",
                    HttpStatus.SERVICE_UNAVAILABLE);
        }

        findActiveByIdentifier(username)
                .filter(u -> u.getEmail() != null)
                .ifPresent(user -> {
                    // Invalidate any earlier unused code so only the latest OTP a user
                    // requested is ever valid.
                    passwordResetOtpRepository.findAllUnusedByUserId(user.getId())
                            .forEach(PasswordResetOtpEntity::markUsed);

                    String otp = generateOtp();
                    Instant expiresAt = Instant.now().plus(OTP_TTL_MINUTES, ChronoUnit.MINUTES);
                    passwordResetOtpRepository.save(
                            new PasswordResetOtpEntity(user.getId(), hashOtp(otp), expiresAt));

                    emailService.sendPasswordResetOtp(user.getEmail(), otp);
                });
        // No else branch: an unknown/deleted/email-less username silently does nothing, but the
        // caller sees the exact same outcome as a real request (see AuthController).
    }

    /**
     * The reset screens accept a username or the account's email, because people often forget which
     * username they chose. An email resolves only when exactly one active account uses it - never guess.
     */
    private Optional<UserEntity> findActiveByIdentifier(String identifier) {
        String trimmed = identifier.trim();
        Optional<UserEntity> byUsername = userRepository.findByUsername(trimmed).filter(u -> !u.isDeleted());
        if (byUsername.isPresent() || !trimmed.contains("@")) {
            return byUsername;
        }
        List<UserEntity> byEmail = userRepository.findAllActiveByEmail(trimmed.toLowerCase(Locale.ROOT));
        return byEmail.size() == 1 ? Optional.of(byEmail.get(0)) : Optional.empty();
    }

    @Override
    @Transactional
    public void confirmPasswordReset(String username, String otp, String newPassword) {
        UserEntity user = findActiveByIdentifier(username).orElseThrow(() -> invalidOtp());

        String candidateHash = hashOtp(otp);
        Instant now = Instant.now();
        PasswordResetOtpEntity validOtp = passwordResetOtpRepository.findAllUnusedByUserId(user.getId()).stream()
                .filter(o -> o.isValid(candidateHash, now))
                .findFirst()
                .orElseThrow(this::invalidOtp);

        validOtp.markUsed();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
    }

    @Override
    @Transactional
    public UserProfileResponse uploadAvatar(UserPrincipal caller, MultipartFile file) {
        UserEntity user = userRepository.findActiveById(caller.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", caller.getUserId()));

        String previousAvatarPath = user.getAvatarPath();
        String storedFilename = avatarStorageService.store(file);
        user.setAvatarPath(storedFilename);
        avatarStorageService.delete(previousAvatarPath);

        return getProfile(caller);
    }

    @Override
    @Transactional
    public UserProfileResponse completeOnboarding(UserPrincipal caller) {
        UserEntity user = userRepository.findActiveById(caller.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", caller.getUserId()));
        user.completeOnboarding();
        return getProfile(caller);
    }

    @Override
    @Transactional
    public UserProfileResponse updatePresence(UserPrincipal caller, PresenceStatus status) {
        UserEntity user = userRepository.findActiveById(caller.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", caller.getUserId()));
        user.setPresenceStatus(status);
        return getProfile(caller);
    }

    private BusinessException invalidOtp() {
        return new BusinessException(
                "INVALID_OTP", "The code is invalid, expired, or already used", HttpStatus.UNPROCESSABLE_ENTITY);
    }

    private String generateOtp() {
        int bound = (int) Math.pow(10, OTP_LENGTH);
        int value = secureRandom.nextInt(bound);
        return String.format("%0" + OTP_LENGTH + "d", value);
    }

    private String hashOtp(String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(otp.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
