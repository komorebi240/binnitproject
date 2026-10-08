package com.company.project.modules.onboarding.service.impl;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.SecureTokens;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.CompanyEntity;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.TeamEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.CompanyRepository;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.TeamRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.EmailService;
import com.company.project.modules.legal.service.TermsService;
import com.company.project.modules.identity.service.UserManagementService;
import com.company.project.modules.onboarding.domain.InvitationEntity;
import com.company.project.modules.onboarding.domain.InvitationStatus;
import com.company.project.modules.onboarding.dto.request.AcceptInvitationRequest;
import com.company.project.modules.onboarding.dto.request.CreateInvitationRequest;
import com.company.project.modules.onboarding.dto.response.InvitationPreviewResponse;
import com.company.project.modules.onboarding.dto.response.InvitationResponse;
import com.company.project.modules.onboarding.repository.InvitationRepository;
import com.company.project.modules.onboarding.service.InvitationService;
import com.company.project.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class InvitationServiceImpl implements InvitationService {

    private static final int INVITATION_TTL_DAYS = 7;

    private final InvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final PositionRepository positionRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final UserManagementService userManagementService;
    private final TermsService termsService;
    private final String publicBaseUrl;

    public InvitationServiceImpl(
            InvitationRepository invitationRepository,
            UserRepository userRepository,
            CompanyRepository companyRepository,
            DepartmentRepository departmentRepository,
            TeamRepository teamRepository,
            PositionRepository positionRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            UserManagementService userManagementService,
            TermsService termsService,
            @Value("${app.public-base-url}") String publicBaseUrl) {
        this.invitationRepository = invitationRepository;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.departmentRepository = departmentRepository;
        this.teamRepository = teamRepository;
        this.positionRepository = positionRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.userManagementService = userManagementService;
        this.termsService = termsService;
        this.publicBaseUrl = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
    }

    @Override
    @Transactional
    public InvitationResponse create(CreateInvitationRequest request, UserPrincipal caller) {
        requireEmailAvailable();
        // Same authority check as creating the user directly - an invitation must never be a way
        // to grant more than the inviter could grant (CLAUDE.md section 9).
        UserManagementService.GrantScope scope = userManagementService.validateGrantScope(
                caller, request.authorityLevel(), request.departmentId(), request.teamId());

        String email = normalize(request.email());
        requireEmailNotRegistered(email);
        // A fresh invitation replaces any earlier open one for the same address.
        invitationRepository.findAllByCompanyIdAndEmailIgnoreCaseAndStatus(caller.getCompanyId(), email, InvitationStatus.PENDING)
                .forEach(InvitationEntity::revoke);

        String token = SecureTokens.randomUrlSafeToken();
        InvitationEntity saved = invitationRepository.save(new InvitationEntity(
                caller.getCompanyId(), email, request.authorityLevel(), scope.departmentId(), scope.teamId(),
                blankToNull(request.title()), caller.getUserId(), SecureTokens.sha256Hex(token), newExpiry()));

        sendInvitationEmail(saved, token, caller.getUserId());
        return toResponses(List.of(saved)).get(0);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvitationResponse> listPending(UserPrincipal caller) {
        List<InvitationEntity> invitations = caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE
                ? invitationRepository.findAllByCompanyIdAndStatusOrderByCreatedAtDesc(caller.getCompanyId(), InvitationStatus.PENDING)
                : invitationRepository.findAllByCompanyIdAndInvitedByUserIdAndStatusOrderByCreatedAtDesc(
                        caller.getCompanyId(), caller.getUserId(), InvitationStatus.PENDING);
        return toResponses(invitations);
    }

    @Override
    @Transactional
    public void revoke(Long invitationId, UserPrincipal caller) {
        InvitationEntity invitation = requireManageable(invitationId, caller);
        if (invitation.getStatus() == InvitationStatus.PENDING) {
            invitation.revoke();
        }
    }

    @Override
    @Transactional
    public InvitationResponse resend(Long invitationId, UserPrincipal caller) {
        requireEmailAvailable();
        InvitationEntity invitation = requireManageable(invitationId, caller);
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new BusinessException("INVITATION_NOT_PENDING", "Only a pending invitation can be resent", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        String token = SecureTokens.randomUrlSafeToken();
        invitation.reissue(SecureTokens.sha256Hex(token), newExpiry());
        sendInvitationEmail(invitation, token, caller.getUserId());
        return toResponses(List.of(invitation)).get(0);
    }

    @Override
    @Transactional(readOnly = true)
    public InvitationPreviewResponse preview(String token) {
        InvitationEntity invitation = invitationRepository.findByTokenHash(SecureTokens.sha256Hex(token))
                .filter(i -> i.isUsable(Instant.now()))
                .orElseThrow(InvitationServiceImpl::invalidInvitation);
        String companyName = companyRepository.findActiveById(invitation.getCompanyId()).map(CompanyEntity::getName).orElse("-");
        String inviterName = userRepository.findById(invitation.getInvitedByUserId()).map(UserEntity::getFullName).orElse("-");
        return new InvitationPreviewResponse(invitation.getEmail(), companyName, invitation.getAuthorityLevel(), inviterName);
    }

    @Override
    @Transactional
    public String accept(String token, AcceptInvitationRequest request) {
        termsService.requireCurrentVersion(request.acceptedTermsVersion());
        InvitationEntity invitation = invitationRepository.findLockedByTokenHash(SecureTokens.sha256Hex(token))
                .filter(i -> i.isUsable(Instant.now()))
                .orElseThrow(InvitationServiceImpl::invalidInvitation);

        if (userRepository.existsByUsername(request.username())) {
            throw new BusinessException("USERNAME_TAKEN", "Username is already in use", HttpStatus.CONFLICT);
        }
        // The address may have been registered since the invitation was written.
        requireEmailNotRegistered(invitation.getEmail());
        // The department/team may have been removed since the invitation was written.
        requireScopeStillValid(invitation);

        UserEntity user = userRepository.save(new UserEntity(
                invitation.getCompanyId(),
                request.username(),
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                invitation.getEmail()));
        positionRepository.save(new PositionEntity(
                user.getId(), invitation.getAuthorityLevel(), invitation.getDepartmentId(), invitation.getTeamId(), invitation.getTitle()));
        termsService.recordAcceptance(user.getId(), request.acceptedTermsVersion());

        invitation.accept(user.getId());
        return user.getUsername();
    }

    private void requireScopeStillValid(InvitationEntity invitation) {
        Long departmentId = invitation.getDepartmentId();
        Long teamId = invitation.getTeamId();
        boolean departmentOk = departmentId == null || departmentRepository.findActiveById(departmentId)
                .map(DepartmentEntity::getCompanyId)
                .filter(invitation.getCompanyId()::equals)
                .isPresent();
        boolean teamOk = teamId == null || teamRepository.findActiveById(teamId)
                .map(TeamEntity::getDepartmentId)
                .filter(d -> d.equals(departmentId))
                .isPresent();
        if (!departmentOk || !teamOk || !PositionEntity.isScopeValid(invitation.getAuthorityLevel(), departmentId, teamId)) {
            throw new BusinessException(
                    "INVITATION_SCOPE_INVALID",
                    "The department or team of this invitation no longer exists - ask for a new invitation",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    private InvitationEntity requireManageable(Long invitationId, UserPrincipal caller) {
        return invitationRepository.findById(invitationId)
                .filter(i -> i.getCompanyId().equals(caller.getCompanyId()))
                .filter(i -> i.getInvitedByUserId().equals(caller.getUserId()) || caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation", invitationId));
    }

    /** One email, one account: the same rule as registering a company (an address already in use is turned away). */
    private void requireEmailNotRegistered(String email) {
        if (!userRepository.findAllActiveByEmail(email).isEmpty()) {
            throw new BusinessException("EMAIL_ALREADY_IN_USE", "This email already belongs to an account", HttpStatus.CONFLICT);
        }
    }

    private void requireEmailAvailable() {
        if (!emailService.isConfigured()) {
            throw new BusinessException(
                    "EMAIL_SERVICE_UNAVAILABLE", "Sending invitations by email is not available right now", HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    private void sendInvitationEmail(InvitationEntity invitation, String token, Long inviterUserId) {
        String companyName = companyRepository.findActiveById(invitation.getCompanyId()).map(CompanyEntity::getName).orElse("Orbit");
        String inviterName = userRepository.findById(inviterUserId).map(UserEntity::getFullName).orElse("Orbit");
        emailService.sendInvitation(invitation.getEmail(), companyName, inviterName, publicBaseUrl + "/invite/" + token);
    }

    private List<InvitationResponse> toResponses(List<InvitationEntity> invitations) {
        Instant now = Instant.now();
        Map<Long, String> userNames = userRepository.findAllById(
                        invitations.stream().map(InvitationEntity::getInvitedByUserId).distinct().toList()).stream()
                .collect(Collectors.toMap(UserEntity::getId, UserEntity::getFullName));
        Map<Long, String> departmentNames = departmentRepository.findAllById(
                        invitations.stream().map(InvitationEntity::getDepartmentId).filter(java.util.Objects::nonNull).distinct().toList()).stream()
                .collect(Collectors.toMap(DepartmentEntity::getId, DepartmentEntity::getName));
        Map<Long, String> teamNames = teamRepository.findAllById(
                        invitations.stream().map(InvitationEntity::getTeamId).filter(java.util.Objects::nonNull).distinct().toList()).stream()
                .collect(Collectors.toMap(TeamEntity::getId, TeamEntity::getName, (a, b) -> a, java.util.HashMap::new));

        return invitations.stream()
                .map(i -> new InvitationResponse(
                        i.getId(),
                        i.getEmail(),
                        i.getAuthorityLevel(),
                        i.getDepartmentId(),
                        i.getDepartmentId() == null ? null : departmentNames.get(i.getDepartmentId()),
                        i.getTeamId(),
                        i.getTeamId() == null ? null : teamNames.get(i.getTeamId()),
                        i.getTitle(),
                        userNames.get(i.getInvitedByUserId()),
                        i.getCreatedAt(),
                        i.getExpiresAt(),
                        !i.getExpiresAt().isAfter(now)))
                .toList();
    }

    private static Instant newExpiry() {
        return Instant.now().plus(INVITATION_TTL_DAYS, ChronoUnit.DAYS);
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static BusinessException invalidInvitation() {
        return new BusinessException("INVITATION_INVALID", "This invitation is invalid or has expired", HttpStatus.NOT_FOUND);
    }
}
