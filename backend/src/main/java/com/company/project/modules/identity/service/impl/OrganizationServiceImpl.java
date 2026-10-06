package com.company.project.modules.identity.service.impl;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.CompanyEntity;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.TeamEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.dto.request.CreateDepartmentRequest;
import com.company.project.modules.identity.dto.request.CreateTeamRequest;
import com.company.project.modules.identity.dto.request.UpdateCompanyRequest;
import com.company.project.modules.identity.dto.request.UpdateDepartmentRequest;
import com.company.project.modules.identity.service.DepartmentAppearance;
import com.company.project.modules.identity.dto.response.CompanyResponse;
import com.company.project.modules.identity.dto.response.DepartmentMemberResponse;
import com.company.project.modules.identity.dto.response.DepartmentResponse;
import com.company.project.modules.identity.dto.response.TeamResponse;
import com.company.project.modules.identity.repository.CompanyRepository;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.TeamRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.AvatarStorageService;
import com.company.project.modules.identity.service.OrganizationService;
import com.company.project.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Every method here re-derives scope from the caller's UserPrincipal (built from their JWT),
 * never from an id the client passed for that purpose - see CLAUDE.md section 9/10 and the
 * Phase 1 plan. Cross-company access is reported as 404 (hide existence of other tenants'
 * data); same-company-wrong-scope is reported as 403 (the caller can legitimately see the
 * resource exists via listDepartments, just can't act on it).
 */
@Service
public class OrganizationServiceImpl implements OrganizationService {

    private final CompanyRepository companyRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final PositionRepository positionRepository;
    private final UserRepository userRepository;
    private final AvatarStorageService avatarStorageService;

    public OrganizationServiceImpl(
            CompanyRepository companyRepository,
            DepartmentRepository departmentRepository,
            TeamRepository teamRepository,
            PositionRepository positionRepository,
            UserRepository userRepository,
            AvatarStorageService avatarStorageService
    ) {
        this.companyRepository = companyRepository;
        this.departmentRepository = departmentRepository;
        this.teamRepository = teamRepository;
        this.positionRepository = positionRepository;
        this.userRepository = userRepository;
        this.avatarStorageService = avatarStorageService;
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyResponse getMyCompany(UserPrincipal caller) {
        return toResponse(requireOwnCompany(caller));
    }

    @Override
    @Transactional
    public CompanyResponse updateCompany(UpdateCompanyRequest request, UserPrincipal caller) {
        requireExecutive(caller, "Only an executive can change the company profile");
        CompanyEntity company = requireOwnCompany(caller);
        company.setName(request.name().trim());
        company.setContactEmail(request.contactEmail() == null || request.contactEmail().isBlank()
                ? null
                : request.contactEmail().trim());
        company.setDescription(request.description() == null || request.description().isBlank()
                ? null
                : request.description().trim());
        return toResponse(company);
    }

    @Override
    @Transactional
    public CompanyResponse uploadCompanyLogo(MultipartFile file, UserPrincipal caller) {
        requireExecutive(caller, "Only an executive can change the company logo");
        CompanyEntity company = requireOwnCompany(caller);

        String previousLogo = company.getLogoPath();
        company.setLogoPath(avatarStorageService.store(file));
        avatarStorageService.delete(previousLogo);
        return toResponse(company);
    }

    @Override
    @Transactional(readOnly = true)
    public AvatarStorageService.Resolved getCompanyLogoFile(UserPrincipal caller) {
        CompanyEntity company = requireOwnCompany(caller);
        if (company.getLogoPath() == null) {
            throw new ResourceNotFoundException("Company logo", company.getId());
        }
        return avatarStorageService.load(company.getLogoPath());
    }

    @Override
    @Transactional
    public CompanyResponse uploadCompanyBanner(MultipartFile file, UserPrincipal caller) {
        requireExecutive(caller, "Only an executive can change the company banner");
        CompanyEntity company = requireOwnCompany(caller);

        String previousBanner = company.getBannerPath();
        company.setBannerPath(avatarStorageService.store(file));
        avatarStorageService.delete(previousBanner);
        return toResponse(company);
    }

    @Override
    @Transactional(readOnly = true)
    public AvatarStorageService.Resolved getCompanyBannerFile(UserPrincipal caller) {
        CompanyEntity company = requireOwnCompany(caller);
        if (company.getBannerPath() == null) {
            throw new ResourceNotFoundException("Company banner", company.getId());
        }
        return avatarStorageService.load(company.getBannerPath());
    }

    private void requireExecutive(UserPrincipal caller, String message) {
        if (caller.getAuthorityLevel() != AuthorityLevel.EXECUTIVE) {
            throw new AccessDeniedException(message);
        }
    }

    private CompanyEntity requireOwnCompany(UserPrincipal caller) {
        return companyRepository.findActiveById(caller.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", caller.getCompanyId()));
    }

    private CompanyResponse toResponse(CompanyEntity company) {
        String logoUrl = company.getLogoPath() == null
                ? null
                : "/companies/me/logo?v=" + Integer.toHexString(company.getLogoPath().hashCode());
        String bannerUrl = company.getBannerPath() == null
                ? null
                : "/companies/me/banner?v=" + Integer.toHexString(company.getBannerPath().hashCode());
        return new CompanyResponse(
                company.getId(), company.getName(), company.getContactEmail(), company.getDescription(), logoUrl, bannerUrl);
    }

    @Override
    @Transactional
    public DepartmentResponse createDepartment(CreateDepartmentRequest request, UserPrincipal caller) {
        DepartmentEntity entity = new DepartmentEntity(caller.getCompanyId(), request.name(), request.description());
        entity.updateDetails(
                request.name(), request.description(),
                DepartmentAppearance.normalizeColor(request.color()), DepartmentAppearance.normalizeIcon(request.icon()));
        DepartmentEntity saved = departmentRepository.save(entity);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public DepartmentResponse updateDepartment(Long departmentId, UpdateDepartmentRequest request, UserPrincipal caller) {
        DepartmentEntity department = requireOwnCompanyDepartment(departmentId, caller);
        boolean isOwnDepartmentHead = caller.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD
                && departmentId.equals(caller.getDepartmentId());
        if (caller.getAuthorityLevel() != AuthorityLevel.EXECUTIVE && !isOwnDepartmentHead) {
            throw new AccessDeniedException("Only an executive or this department's head can edit it");
        }

        String name = request.name().trim();
        boolean nameTaken = departmentRepository.findAllActiveByCompanyId(caller.getCompanyId()).stream()
                .anyMatch(d -> !d.getId().equals(departmentId) && d.getName().equalsIgnoreCase(name));
        if (nameTaken) {
            throw new BusinessException(
                    "DEPARTMENT_NAME_TAKEN", "Another department already uses this name", HttpStatus.CONFLICT);
        }
        String description = request.description() == null || request.description().isBlank()
                ? null : request.description().trim();
        department.updateDetails(
                name, description,
                DepartmentAppearance.normalizeColor(request.color()), DepartmentAppearance.normalizeIcon(request.icon()));
        return toResponse(department);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentResponse> listDepartments(UserPrincipal caller) {
        return departmentRepository.findAllActiveByCompanyId(caller.getCompanyId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentMemberResponse> listDepartmentMembers(Long departmentId, UserPrincipal caller) {
        requireOwnCompanyDepartment(departmentId, caller);
        return toMemberResponses(positionRepository.findAllActiveByDepartmentId(departmentId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentMemberResponse> listTeamMembers(Long teamId, UserPrincipal caller) {
        TeamEntity team = teamRepository.findActiveById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", teamId));
        requireOwnCompanyDepartment(team.getDepartmentId(), caller);
        return toMemberResponses(positionRepository.findAllActiveByTeamId(teamId));
    }

    private List<DepartmentMemberResponse> toMemberResponses(List<PositionEntity> positions) {
        List<Long> userIds = positions.stream().map(PositionEntity::getUserId).toList();
        var usersById = userRepository.findAllActiveByIds(userIds).stream()
                .collect(java.util.stream.Collectors.toMap(UserEntity::getId, java.util.function.Function.identity()));

        // The broadcast bot is a chat-only identity, never a directory entry.
        return positions.stream()
                .filter(p -> usersById.containsKey(p.getUserId()) && !usersById.get(p.getUserId()).isSystemAccount())
                .map(p -> {
                    UserEntity user = usersById.get(p.getUserId());
                    return new DepartmentMemberResponse(
                            user.getId(), user.getFullName(), p.getTitle(), user.getEmail(), p.getAuthorityLevel(),
                            avatarUrl(user), user.getPresenceStatus());
                })
                .toList();
    }

    private String avatarUrl(UserEntity user) {
        return user.getAvatarPath() == null ? null : "/users/" + user.getId() + "/avatar";
    }

    @Override
    @Transactional
    public void deleteDepartment(Long departmentId, UserPrincipal caller) {
        DepartmentEntity department = requireOwnCompanyDepartment(departmentId, caller);

        boolean hasActiveTeams = !teamRepository.findAllActiveByDepartmentId(departmentId).isEmpty();
        boolean hasActiveMembers = !positionRepository.findAllActiveByDepartmentId(departmentId).isEmpty();
        if (hasActiveTeams || hasActiveMembers) {
            throw new BusinessException(
                    "DEPARTMENT_NOT_EMPTY",
                    "Cannot delete a department that still has teams or members",
                    HttpStatus.CONFLICT);
        }

        department.markDeleted();
    }

    @Override
    @Transactional
    public TeamResponse createTeam(Long departmentId, CreateTeamRequest request, UserPrincipal caller) {
        DepartmentEntity department = requireOwnCompanyDepartment(departmentId, caller);

        if (caller.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD
                && !department.getId().equals(caller.getDepartmentId())) {
            throw new AccessDeniedException("You can only create teams in your own department");
        }

        TeamEntity saved = teamRepository.save(new TeamEntity(department.getId(), request.name()));
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponse> listTeams(Long departmentId, UserPrincipal caller) {
        requireOwnCompanyDepartment(departmentId, caller);
        return teamRepository.findAllActiveByDepartmentId(departmentId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void deleteTeam(Long teamId, UserPrincipal caller) {
        TeamEntity team = teamRepository.findActiveById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", teamId));
        DepartmentEntity department = requireOwnCompanyDepartment(team.getDepartmentId(), caller);

        if (caller.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD
                && !department.getId().equals(caller.getDepartmentId())) {
            throw new AccessDeniedException("You can only delete teams in your own department");
        }

        boolean hasActiveMembers = !positionRepository.findAllActiveByTeamId(teamId).isEmpty();
        if (hasActiveMembers) {
            throw new BusinessException(
                    "TEAM_NOT_EMPTY", "Cannot delete a team that still has members", HttpStatus.CONFLICT);
        }

        team.markDeleted();
    }

    /** Loads the department and enforces the tenant boundary - 404, not 403, across companies. */
    private DepartmentEntity requireOwnCompanyDepartment(Long departmentId, UserPrincipal caller) {
        DepartmentEntity department = departmentRepository.findActiveById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department", departmentId));
        if (!department.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("Department", departmentId);
        }
        return department;
    }

    private DepartmentResponse toResponse(DepartmentEntity entity) {
        return new DepartmentResponse(
                entity.getId(), entity.getName(), entity.getDescription(), entity.getCompanyId(),
                entity.getColor(), entity.getIcon());
    }

    private TeamResponse toResponse(TeamEntity entity) {
        return new TeamResponse(entity.getId(), entity.getName(), entity.getDepartmentId());
    }
}
