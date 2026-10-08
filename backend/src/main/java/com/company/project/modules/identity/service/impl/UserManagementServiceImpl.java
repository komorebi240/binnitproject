package com.company.project.modules.identity.service.impl;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.SecureTokens;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.EmailChangeRequestEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.TeamEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.dto.request.CreateUserRequest;
import com.company.project.modules.identity.dto.request.UpdatePositionRequest;
import com.company.project.modules.identity.dto.response.UserSummaryResponse;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.EmailChangeRequestRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.TeamRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.AvatarStorageService;
import com.company.project.modules.identity.service.UserManagementService;
import com.company.project.security.UserPrincipal;
import com.company.project.modules.identity.service.AuthService;
import com.company.project.modules.identity.service.EmailService;
import com.company.project.modules.identity.service.SessionService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Who can create/remove whom mirrors the org hierarchy (Phase 1 plan): EXECUTIVE manages
 * anyone in their company; DEPARTMENT_HEAD only within their own department; TEAM_LEAD only
 * within their own team, and only EMPLOYEE. Every check re-derives scope from the caller's
 * UserPrincipal - the client never gets to name its own companyId (CLAUDE.md section 9/10).
 */
@Service
public class UserManagementServiceImpl implements UserManagementService {

    private static final int EMAIL_CHANGE_OTP_DIGITS = 6;
    private static final int EMAIL_CHANGE_OTP_TTL_MINUTES = 15;
    private static final int MAX_EMAIL_CHANGE_ATTEMPTS = 5;

    private final UserRepository userRepository;
    private final PositionRepository positionRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final PasswordEncoder passwordEncoder;
    private final AvatarStorageService avatarStorageService;
    private final AuthService authService;
    private final EmailService emailService;
    private final EmailChangeRequestRepository emailChangeRepository;
    private final SessionService sessionService;

    public UserManagementServiceImpl(
            UserRepository userRepository,
            PositionRepository positionRepository,
            DepartmentRepository departmentRepository,
            TeamRepository teamRepository,
            PasswordEncoder passwordEncoder,
            AvatarStorageService avatarStorageService,
            AuthService authService,
            EmailService emailService,
            EmailChangeRequestRepository emailChangeRepository,
            SessionService sessionService
    ) {
        this.userRepository = userRepository;
        this.positionRepository = positionRepository;
        this.departmentRepository = departmentRepository;
        this.teamRepository = teamRepository;
        this.passwordEncoder = passwordEncoder;
        this.avatarStorageService = avatarStorageService;
        this.authService = authService;
        this.emailService = emailService;
        this.emailChangeRepository = emailChangeRepository;
        this.sessionService = sessionService;
    }

    @Override
    @Transactional
    public UserSummaryResponse createUser(CreateUserRequest request, UserPrincipal caller) {
        assertCallerCanGrant(caller, request.authorityLevel(), request.departmentId(), request.teamId());

        if (userRepository.existsByUsername(request.username())) {
            throw new BusinessException("USERNAME_TAKEN", "Username is already in use", HttpStatus.CONFLICT);
        }
        if (request.employeeCode() != null && userRepository.existsByEmployeeCode(request.employeeCode())) {
            throw new BusinessException("EMPLOYEE_CODE_TAKEN", "Employee code is already in use", HttpStatus.CONFLICT);
        }

        GrantScope scope = resolveScope(caller, request.authorityLevel(), request.departmentId(), request.teamId());
        Long departmentId = scope.departmentId();
        Long teamId = scope.teamId();

        UserEntity user = new UserEntity(
                caller.getCompanyId(),
                request.username(),
                passwordEncoder.encode(request.password()),
                request.fullName(),
                request.email());
        user.setPhone(request.phone());
        user.setEmployeeCode(request.employeeCode());
        user.setStartDate(request.startDate());
        UserEntity savedUser = userRepository.save(user);

        PositionEntity position = new PositionEntity(
                savedUser.getId(), request.authorityLevel(), departmentId, teamId, request.title());
        PositionEntity savedPosition = positionRepository.save(position);

        return toSummary(savedUser, savedPosition);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserSummaryResponse> listUsers(UserPrincipal caller) {
        List<PositionEntity> positions = switch (caller.getAuthorityLevel()) {
            case EXECUTIVE -> {
                List<UserEntity> companyUsers = userRepository.findAllActiveByCompanyId(caller.getCompanyId());
                yield positionRepository.findAllActiveByUserIds(companyUsers.stream().map(UserEntity::getId).toList());
            }
            case DEPARTMENT_HEAD -> positionRepository.findAllActiveByDepartmentId(caller.getDepartmentId());
            case TEAM_LEAD -> positionRepository.findAllActiveByTeamId(caller.getTeamId());
            case EMPLOYEE -> throw new AccessDeniedException("Employees cannot list other users");
        };

        List<Long> userIds = positions.stream().map(PositionEntity::getUserId).toList();
        Map<Long, UserEntity> usersById = userRepository.findAllActiveByIds(userIds).stream()
                .collect(java.util.stream.Collectors.toMap(UserEntity::getId, Function.identity()));

        // The broadcast bot is a chat-only identity, never a directory entry.
        return positions.stream()
                .filter(p -> usersById.containsKey(p.getUserId()) && !usersById.get(p.getUserId()).isSystemAccount())
                .map(p -> toSummary(usersById.get(p.getUserId()), p))
                .toList();
    }

    @Override
    @Transactional
    public void deleteUser(Long userId, String password, UserPrincipal caller) {
        UserEntity callerUser = userRepository.findActiveById(caller.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", caller.getUserId()));
        if (!passwordEncoder.matches(password, callerUser.getPasswordHash())) {
            throw new BusinessException(
                    "INVALID_PASSWORD", "Your password is incorrect", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        if (userId.equals(caller.getUserId())) {
            throw new BusinessException(
                    "CANNOT_DELETE_SELF", "You cannot delete your own account", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        UserEntity target = userRepository.findActiveById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (!target.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("User", userId);
        }

        PositionEntity targetPosition = positionRepository.findActiveByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        assertCallerCanManage(caller, targetPosition);

        target.deactivateAndDelete();
        targetPosition.markDeleted();
        sessionService.endAll(userId);
    }

    @Override
    @Transactional
    public UserSummaryResponse updatePosition(Long userId, UpdatePositionRequest request, UserPrincipal caller) {
        UserEntity target = userRepository.findActiveById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (!target.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("User", userId);
        }
        PositionEntity currentPosition = positionRepository.findActiveByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        // Can the caller touch the CURRENT holder (e.g. a department head must not be able to
        // reach into another department's team lead), and separately, can they grant the NEW
        // level/scope being requested - same two checks used by delete and create respectively.
        assertCallerCanManage(caller, currentPosition);
        assertCallerCanGrant(caller, request.authorityLevel(), request.departmentId(), request.teamId());

        GrantScope scope = resolveScope(caller, request.authorityLevel(), request.departmentId(), request.teamId());
        Long departmentId = scope.departmentId();
        Long teamId = scope.teamId();

        // Close the old position rather than editing it in place - the closed row is a free,
        // implicit promotion/transfer history (still queryable, just is_deleted=1). Flushed
        // explicitly before the insert: Hibernate's default flush order would otherwise emit
        // the new row's INSERT before this row's UPDATE, and ux_positions_active_user (unique
        // on user_id WHERE is_deleted=0) briefly sees two active rows for the same user.
        currentPosition.markDeleted();
        positionRepository.saveAndFlush(currentPosition);
        PositionEntity newPosition = positionRepository.save(
                new PositionEntity(userId, request.authorityLevel(), departmentId, teamId, request.title()));

        return toSummary(target, newPosition);
    }

    @Override
    @Transactional
    public UserSummaryResponse setActive(Long userId, boolean active, UserPrincipal caller) {
        if (userId.equals(caller.getUserId())) {
            throw new BusinessException(
                    "CANNOT_DEACTIVATE_SELF", "You cannot change your own account status", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        UserEntity target = userRepository.findActiveById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (!target.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("User", userId);
        }
        PositionEntity targetPosition = positionRepository.findActiveByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        assertCallerCanManage(caller, targetPosition);

        target.setActive(active);
        if (!active) {
            // A switched-off account must not keep working until its access token expires.
            sessionService.endAll(userId);
        }
        return toSummary(target, targetPosition);
    }

    @Override
    @Transactional(readOnly = true)
    public GrantScope validateGrantScope(UserPrincipal caller, AuthorityLevel level, Long departmentId, Long teamId) {
        assertCallerCanGrant(caller, level, departmentId, teamId);
        return resolveScope(caller, level, departmentId, teamId);
    }

    /**
     * Tenant-checks the department/team (a team implies exactly one department, so its own parent
     * fills in departmentId when only a teamId was given) and verifies they fit the level.
     */
    private GrantScope resolveScope(UserPrincipal caller, AuthorityLevel level, Long departmentId, Long teamId) {
        Long resolvedDepartmentId = resolveOwnCompanyDepartment(departmentId, caller);
        Long resolvedTeamId = null;
        if (teamId != null) {
            resolvedDepartmentId = resolveDepartmentTeamAndReturnDepartmentId(teamId, resolvedDepartmentId, caller);
            resolvedTeamId = teamId;
        }

        if (!PositionEntity.isScopeValid(level, resolvedDepartmentId, resolvedTeamId)) {
            throw new BusinessException(
                    "INVALID_POSITION_SCOPE",
                    "departmentId/teamId do not match authorityLevel " + level,
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }
        return new GrantScope(resolvedDepartmentId, resolvedTeamId);
    }

    /** Checked before creating a user - can the caller grant this level at this department/team? */
    private void assertCallerCanGrant(UserPrincipal caller, AuthorityLevel target, Long departmentId, Long teamId) {
        switch (caller.getAuthorityLevel()) {
            case EXECUTIVE -> {
                // Any level, any department/team - as long as it belongs to their own company
                // (checked when resolving department/team below).
            }
            case DEPARTMENT_HEAD -> {
                if (target == AuthorityLevel.EXECUTIVE || target == AuthorityLevel.DEPARTMENT_HEAD) {
                    throw new AccessDeniedException("Department heads cannot create executives or other department heads");
                }
                if (departmentId == null || !departmentId.equals(caller.getDepartmentId())) {
                    throw new AccessDeniedException("You can only add members to your own department");
                }
            }
            case TEAM_LEAD -> {
                if (target != AuthorityLevel.EMPLOYEE) {
                    throw new AccessDeniedException("Team leads can only add employees");
                }
                if (teamId == null || !teamId.equals(caller.getTeamId())) {
                    throw new AccessDeniedException("You can only add members to your own team");
                }
            }
            case EMPLOYEE -> throw new AccessDeniedException("Employees cannot create users");
        }
    }

    /** Checked before deleting a user - can the caller manage someone holding this position? */
    @Override
    @Transactional
    public void sendPasswordReset(Long userId, UserPrincipal caller) {
        ManagedUser managed = requireManagedUser(userId, caller);
        if (managed.user().getEmail() == null || managed.user().getEmail().isBlank()) {
            throw new BusinessException(
                    "NO_EMAIL", "This user has no email address on file", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        authService.requestPasswordReset(managed.user().getUsername());
    }

    @Override
    @Transactional
    public void requestEmailChange(Long userId, String newEmail, UserPrincipal caller) {
        ManagedUser managed = requireManagedUser(userId, caller);
        String email = newEmail.trim().toLowerCase();
        if (email.equalsIgnoreCase(managed.user().getEmail())) {
            throw new BusinessException("SAME_EMAIL", "That is already this user's email", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (!emailService.isConfigured()) {
            throw new BusinessException(
                    "EMAIL_SERVICE_UNAVAILABLE", "Email is not available right now", HttpStatus.SERVICE_UNAVAILABLE);
        }
        // Only the latest code is ever valid.
        emailChangeRepository.findOpenByUserId(userId).forEach(EmailChangeRequestEntity::markConsumed);

        String otp = SecureTokens.randomNumericCode(EMAIL_CHANGE_OTP_DIGITS);
        emailChangeRepository.save(new EmailChangeRequestEntity(
                userId, email, SecureTokens.sha256Hex(otp),
                Instant.now().plus(EMAIL_CHANGE_OTP_TTL_MINUTES, ChronoUnit.MINUTES), caller.getUserId()));
        emailService.sendEmailChangeOtp(email, otp);
    }

    /** {@code noRollbackFor}: a wrong code throws, but the failed-attempt counter must still be saved. */
    @Override
    @Transactional(noRollbackFor = BusinessException.class)
    public UserSummaryResponse confirmEmailChange(Long userId, String otp, UserPrincipal caller) {
        ManagedUser managed = requireManagedUser(userId, caller);
        EmailChangeRequestEntity request = emailChangeRepository.findOpenByUserId(userId).stream()
                .findFirst()
                .orElseThrow(UserManagementServiceImpl::invalidEmailChangeCode);
        if (!request.getExpiresAt().isAfter(Instant.now()) || request.getAttempts() >= MAX_EMAIL_CHANGE_ATTEMPTS) {
            throw invalidEmailChangeCode();
        }
        if (!MessageDigest.isEqual(
                request.getOtpHash().getBytes(StandardCharsets.UTF_8),
                SecureTokens.sha256Hex(otp).getBytes(StandardCharsets.UTF_8))) {
            request.recordFailedAttempt();
            throw invalidEmailChangeCode();
        }

        String previousEmail = managed.user().getEmail();
        managed.user().setEmail(request.getNewEmail());
        request.markConsumed();
        if (previousEmail != null && !previousEmail.isBlank()) {
            emailService.sendEmailChangedNotice(previousEmail, request.getNewEmail());
        }
        return toSummary(managed.user(), managed.position());
    }

    private static BusinessException invalidEmailChangeCode() {
        return new BusinessException(
                "INVALID_OTP", "The code is wrong or has expired", HttpStatus.UNPROCESSABLE_ENTITY);
    }

    private record ManagedUser(UserEntity user, PositionEntity position) {
    }

    /** The target of an account action: same company, never yourself, and within the caller's authority. */
    private ManagedUser requireManagedUser(Long userId, UserPrincipal caller) {
        if (userId.equals(caller.getUserId())) {
            throw new BusinessException(
                    "CANNOT_MANAGE_SELF", "Use your own settings to change your own account", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        UserEntity target = userRepository.findActiveById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (!target.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("User", userId);
        }
        PositionEntity position = positionRepository.findActiveByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        assertCallerCanManage(caller, position);
        return new ManagedUser(target, position);
    }

    private void assertCallerCanManage(UserPrincipal caller, PositionEntity target) {
        switch (caller.getAuthorityLevel()) {
            case EXECUTIVE -> {
                // Any position within the same company (already verified by the caller).
            }
            case DEPARTMENT_HEAD -> {
                if (target.getAuthorityLevel() == AuthorityLevel.EXECUTIVE
                        || target.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD) {
                    throw new AccessDeniedException("Department heads cannot remove executives or other department heads");
                }
                if (!caller.getDepartmentId().equals(target.getDepartmentId())) {
                    throw new AccessDeniedException("You can only remove members of your own department");
                }
            }
            case TEAM_LEAD -> {
                if (target.getAuthorityLevel() != AuthorityLevel.EMPLOYEE
                        || !caller.getTeamId().equals(target.getTeamId())) {
                    throw new AccessDeniedException("You can only remove employees of your own team");
                }
            }
            case EMPLOYEE -> throw new AccessDeniedException("Employees cannot remove users");
        }
    }

    private Long resolveOwnCompanyDepartment(Long departmentId, UserPrincipal caller) {
        if (departmentId == null) {
            return null;
        }
        DepartmentEntity department = departmentRepository.findActiveById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department", departmentId));
        if (!department.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("Department", departmentId);
        }
        return department.getId();
    }

    /** Returns the team's own departmentId (after verifying tenant + consistency with departmentId, if given). */
    private Long resolveDepartmentTeamAndReturnDepartmentId(Long teamId, Long departmentId, UserPrincipal caller) {
        TeamEntity team = teamRepository.findActiveById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", teamId));
        DepartmentEntity teamDepartment = departmentRepository.findActiveById(team.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Team", teamId));
        if (!teamDepartment.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("Team", teamId);
        }
        if (departmentId != null && !team.getDepartmentId().equals(departmentId)) {
            throw new BusinessException(
                    "TEAM_DEPARTMENT_MISMATCH", "teamId does not belong to departmentId", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        return team.getDepartmentId();
    }

    private UserSummaryResponse toSummary(UserEntity user, PositionEntity position) {
        return new UserSummaryResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                position.getAuthorityLevel(),
                position.getTitle(),
                position.getDepartmentId(),
                position.getTeamId(),
                user.isActive(),
                user.getPhone(),
                user.getEmployeeCode(),
                user.getStartDate(),
                avatarUrl(user),
                user.getPresenceStatus());
    }

    private String avatarUrl(UserEntity user) {
        return user.getAvatarPath() == null ? null : "/users/" + user.getId() + "/avatar";
    }

    @Override
    @Transactional(readOnly = true)
    public AvatarStorageService.Resolved getAvatarFile(Long userId, UserPrincipal caller) {
        UserEntity target = userRepository.findActiveById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (!target.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("User", userId);
        }
        if (target.getAvatarPath() == null) {
            throw new ResourceNotFoundException("Avatar", userId);
        }
        return avatarStorageService.load(target.getAvatarPath());
    }
}
