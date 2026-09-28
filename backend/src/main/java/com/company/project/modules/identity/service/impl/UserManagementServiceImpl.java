package com.company.project.modules.identity.service.impl;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.TeamEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.dto.request.CreateUserRequest;
import com.company.project.modules.identity.dto.response.UserSummaryResponse;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.TeamRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.UserManagementService;
import com.company.project.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Who can create/remove whom mirrors the org hierarchy (Phase 1 plan): EXECUTIVE manages
 * anyone in their company; DEPARTMENT_HEAD only within their own department; TEAM_LEAD only
 * within their own team, and only EMPLOYEE. Every check re-derives scope from the caller's
 * UserPrincipal — the client never gets to name its own companyId (CLAUDE.md section 9/10).
 */
@Service
public class UserManagementServiceImpl implements UserManagementService {

    private final UserRepository userRepository;
    private final PositionRepository positionRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final PasswordEncoder passwordEncoder;

    public UserManagementServiceImpl(
            UserRepository userRepository,
            PositionRepository positionRepository,
            DepartmentRepository departmentRepository,
            TeamRepository teamRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.positionRepository = positionRepository;
        this.departmentRepository = departmentRepository;
        this.teamRepository = teamRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public UserSummaryResponse createUser(CreateUserRequest request, UserPrincipal caller) {
        assertCallerCanGrant(caller, request.authorityLevel(), request.departmentId(), request.teamId());

        if (userRepository.existsByUsername(request.username())) {
            throw new BusinessException("USERNAME_TAKEN", "Username is already in use", HttpStatus.CONFLICT);
        }

        Long departmentId = resolveOwnCompanyDepartment(request.departmentId(), caller);
        Long teamId = null;
        if (request.teamId() != null) {
            // Resolving a team also fills in departmentId from the team's own parent when the
            // request only supplied a teamId — a team implies exactly one department.
            departmentId = resolveDepartmentTeamAndReturnDepartmentId(request.teamId(), departmentId, caller);
            teamId = request.teamId();
        }

        if (!PositionEntity.isScopeValid(request.authorityLevel(), departmentId, teamId)) {
            throw new BusinessException(
                    "INVALID_POSITION_SCOPE",
                    "departmentId/teamId do not match authorityLevel " + request.authorityLevel(),
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        UserEntity user = new UserEntity(
                caller.getCompanyId(),
                request.username(),
                passwordEncoder.encode(request.password()),
                request.fullName(),
                request.email());
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

        return positions.stream()
                .filter(p -> usersById.containsKey(p.getUserId()))
                .map(p -> toSummary(usersById.get(p.getUserId()), p))
                .toList();
    }

    @Override
    @Transactional
    public void deleteUser(Long userId, UserPrincipal caller) {
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
    }

    /** Checked before creating a user — can the caller grant this level at this department/team? */
    private void assertCallerCanGrant(UserPrincipal caller, AuthorityLevel target, Long departmentId, Long teamId) {
        switch (caller.getAuthorityLevel()) {
            case EXECUTIVE -> {
                // Any level, any department/team — as long as it belongs to their own company
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

    /** Checked before deleting a user — can the caller manage someone holding this position? */
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
                position.getTeamId());
    }
}
