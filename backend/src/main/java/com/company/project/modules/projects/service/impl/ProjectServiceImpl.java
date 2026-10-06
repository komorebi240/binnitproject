package com.company.project.modules.projects.service.impl;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.NotificationType;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.drive.dto.response.CatalogFolderResponse;
import com.company.project.modules.drive.dto.response.FolderShareResult;
import com.company.project.modules.drive.service.DriveCatalogService;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.notifications.service.NotificationService;
import com.company.project.modules.projects.domain.ProjectDepartmentEntity;
import com.company.project.modules.projects.domain.ProjectDepartmentRole;
import com.company.project.modules.projects.domain.ProjectEntity;
import com.company.project.modules.projects.domain.ProjectFolderEntity;
import com.company.project.modules.projects.domain.ProjectInviteStatus;
import com.company.project.modules.projects.domain.ProjectMemberEntity;
import com.company.project.modules.projects.domain.ProjectMessageEntity;
import com.company.project.modules.projects.dto.request.AddProjectMemberRequest;
import com.company.project.modules.projects.dto.request.CreateProjectRequest;
import com.company.project.modules.projects.dto.request.InviteDepartmentRequest;
import com.company.project.modules.projects.dto.request.LinkProjectFolderRequest;
import com.company.project.modules.projects.dto.request.SendProjectMessageRequest;
import com.company.project.modules.projects.dto.request.UpdateProjectRequest;
import com.company.project.modules.projects.dto.response.ProjectDepartmentResponse;
import com.company.project.modules.projects.dto.response.ProjectDetailResponse;
import com.company.project.modules.projects.dto.response.ProjectFolderLinkResponse;
import com.company.project.modules.projects.dto.response.ProjectFolderResponse;
import com.company.project.modules.projects.dto.response.ProjectMemberResponse;
import com.company.project.modules.projects.dto.response.ProjectMessageResponse;
import com.company.project.modules.projects.dto.response.ProjectSummaryResponse;
import com.company.project.modules.projects.repository.ProjectDepartmentRepository;
import com.company.project.modules.projects.repository.ProjectFolderRepository;
import com.company.project.modules.projects.repository.ProjectMemberRepository;
import com.company.project.modules.projects.repository.ProjectMessageRepository;
import com.company.project.modules.projects.repository.ProjectRepository;
import com.company.project.modules.projects.service.ProjectAccessService;
import com.company.project.modules.projects.service.ProjectService;
import com.company.project.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Authorization summary (CLAUDE.md section 9): everything is derived from the caller's own identity, never
 * from ids the client sends. An executive manages every project of their company; the head of the owning
 * department manages that project; a head of an invited department may answer the invitation and then add
 * people of THEIR OWN department; members use the tasks, chat and folders. Another company's project is
 * always "not found".
 */
@Service
public class ProjectServiceImpl implements ProjectService {

    private static final Logger log = LoggerFactory.getLogger(ProjectServiceImpl.class);

    private final ProjectRepository projectRepository;
    private final ProjectDepartmentRepository projectDepartmentRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectFolderRepository folderRepository;
    private final ProjectMessageRepository messageRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final PositionRepository positionRepository;
    private final NotificationService notificationService;
    private final DriveCatalogService driveCatalogService;
    private final ProjectAccessService access;

    public ProjectServiceImpl(
            ProjectRepository projectRepository,
            ProjectDepartmentRepository projectDepartmentRepository,
            ProjectMemberRepository memberRepository,
            ProjectFolderRepository folderRepository,
            ProjectMessageRepository messageRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            PositionRepository positionRepository,
            NotificationService notificationService,
            DriveCatalogService driveCatalogService,
            ProjectAccessService access
    ) {
        this.projectRepository = projectRepository;
        this.projectDepartmentRepository = projectDepartmentRepository;
        this.memberRepository = memberRepository;
        this.folderRepository = folderRepository;
        this.messageRepository = messageRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.positionRepository = positionRepository;
        this.notificationService = notificationService;
        this.driveCatalogService = driveCatalogService;
        this.access = access;
    }

    // ------------------------------------------------------------------ projects

    @Override
    @Transactional
    public ProjectDetailResponse createProject(CreateProjectRequest request, UserPrincipal caller) {
        boolean executive = caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE;
        if (!executive && caller.getAuthorityLevel() != AuthorityLevel.DEPARTMENT_HEAD) {
            throw new AccessDeniedException("Only an executive or a department head can start a project");
        }

        Long ownerDepartmentId = request.ownerDepartmentId();
        if (executive) {
            if (ownerDepartmentId == null) {
                throw new BusinessException(
                        "OWNER_DEPARTMENT_REQUIRED", "ownerDepartmentId is required", HttpStatus.UNPROCESSABLE_ENTITY);
            }
        } else if (ownerDepartmentId == null || ownerDepartmentId.equals(caller.getDepartmentId())) {
            ownerDepartmentId = caller.getDepartmentId();
        } else {
            throw new AccessDeniedException("A department head can only start a project for their own department");
        }
        requireOwnCompanyDepartment(ownerDepartmentId, caller);

        Set<Long> supportIds = new LinkedHashSet<>(request.supportDepartmentIds() == null ? List.of() : request.supportDepartmentIds());
        supportIds.remove(ownerDepartmentId);
        for (Long departmentId : supportIds) {
            requireOwnCompanyDepartment(departmentId, caller);
        }

        String description = blankToNull(request.description());
        ProjectEntity project = projectRepository.save(new ProjectEntity(
                caller.getCompanyId(), request.name().trim(), description, ownerDepartmentId, caller.getUserId()));
        projectDepartmentRepository.save(ProjectDepartmentEntity.owner(project.getId(), ownerDepartmentId, caller.getUserId()));
        memberRepository.save(new ProjectMemberEntity(project.getId(), caller.getUserId(), caller.getDepartmentId(), caller.getUserId()));

        String note = blankToNull(request.inviteNote());
        for (Long departmentId : supportIds) {
            projectDepartmentRepository.save(ProjectDepartmentEntity.invite(project.getId(), departmentId, caller.getUserId(), note));
            notifyDepartmentHeads(departmentId, project, caller);
        }
        return toDetail(project, caller);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectSummaryResponse> listProjects(UserPrincipal caller) {
        List<ProjectEntity> projects;
        if (caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE) {
            projects = projectRepository.findAllActiveByCompanyId(caller.getCompanyId());
        } else {
            Set<Long> ids = new HashSet<>();
            memberRepository.findAllActiveByUserId(caller.getUserId()).forEach(m -> ids.add(m.getProjectId()));
            if (caller.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD && caller.getDepartmentId() != null) {
                projectDepartmentRepository.findAllActiveByDepartmentId(caller.getDepartmentId())
                        .forEach(d -> ids.add(d.getProjectId()));
            }
            projects = ids.isEmpty()
                    ? List.of()
                    : projectRepository.findAllActiveByIds(new ArrayList<>(ids)).stream()
                            .filter(p -> p.getCompanyId().equals(caller.getCompanyId()))
                            .toList();
        }
        if (projects.isEmpty()) {
            return List.of();
        }

        List<Long> projectIds = projects.stream().map(ProjectEntity::getId).toList();
        Map<Long, List<ProjectDepartmentEntity>> departmentsByProject = projectDepartmentRepository
                .findAllActiveByProjectIds(projectIds).stream().collect(Collectors.groupingBy(ProjectDepartmentEntity::getProjectId));
        Map<Long, List<ProjectMemberEntity>> membersByProject = memberRepository
                .findAllActiveByProjectIds(projectIds).stream().collect(Collectors.groupingBy(ProjectMemberEntity::getProjectId));
        Map<Long, String> departmentNames = departmentNames(
                projects.stream().map(ProjectEntity::getOwnerDepartmentId).collect(Collectors.toSet()));

        return projects.stream().map(project -> {
            List<ProjectDepartmentEntity> departments = departmentsByProject.getOrDefault(project.getId(), List.of());
            List<ProjectMemberEntity> members = membersByProject.getOrDefault(project.getId(), List.of());
            boolean waiting = departments.stream()
                    .anyMatch(d -> d.getStatus() == ProjectInviteStatus.INVITED && canRespond(caller, d.getDepartmentId()));
            return new ProjectSummaryResponse(
                    project.getId(), project.getName(), project.getDescription(), project.getOwnerDepartmentId(),
                    departmentNames.get(project.getOwnerDepartmentId()), members.size(),
                    (int) departments.stream().filter(d -> d.getRole() == ProjectDepartmentRole.SUPPORT
                            && d.getStatus() == ProjectInviteStatus.ACCEPTED).count(),
                    members.stream().anyMatch(m -> m.getUserId().equals(caller.getUserId())), waiting);
        }).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectDetailResponse getProject(Long projectId, UserPrincipal caller) {
        return toDetail(requireViewable(projectId, caller), caller);
    }

    @Override
    @Transactional
    public ProjectDetailResponse updateProject(Long projectId, UpdateProjectRequest request, UserPrincipal caller) {
        ProjectEntity project = requireManageable(projectId, caller);
        project.updateDetails(request.name().trim(), blankToNull(request.description()));
        return toDetail(project, caller);
    }

    @Override
    @Transactional
    public void deleteProject(Long projectId, UserPrincipal caller) {
        requireManageable(projectId, caller).markDeleted();
    }

    // --------------------------------------------------------------- departments

    @Override
    @Transactional
    public ProjectDetailResponse inviteDepartment(Long projectId, InviteDepartmentRequest request, UserPrincipal caller) {
        ProjectEntity project = requireManageable(projectId, caller);
        Long departmentId = request.departmentId();
        requireOwnCompanyDepartment(departmentId, caller);
        if (departmentId.equals(project.getOwnerDepartmentId())) {
            throw new BusinessException("OWNER_DEPARTMENT", "The owning department is already part of the project", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        String note = blankToNull(request.note());
        var existing = projectDepartmentRepository.findActive(projectId, departmentId);
        if (existing.isPresent()) {
            if (existing.get().getStatus() != ProjectInviteStatus.DECLINED) {
                throw new BusinessException("ALREADY_INVITED", "This department is already invited or taking part", HttpStatus.CONFLICT);
            }
            existing.get().reinvite(caller.getUserId(), note);
        } else {
            projectDepartmentRepository.save(ProjectDepartmentEntity.invite(projectId, departmentId, caller.getUserId(), note));
        }
        notifyDepartmentHeads(departmentId, project, caller);
        return toDetail(project, caller);
    }

    @Override
    @Transactional
    public ProjectDetailResponse respondToInvitation(Long projectId, Long departmentId, boolean accept, UserPrincipal caller) {
        ProjectEntity project = requireViewable(projectId, caller);
        ProjectDepartmentEntity invitation = projectDepartmentRepository.findActive(projectId, departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Project department", departmentId));
        if (!canRespond(caller, departmentId)) {
            throw new AccessDeniedException("Only that department's head or an executive can answer this invitation");
        }
        if (invitation.getStatus() != ProjectInviteStatus.INVITED) {
            throw new BusinessException("INVITATION_ANSWERED", "This invitation was already answered", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        invitation.decide(accept, caller.getUserId());

        if (!project.getCreatedByUserId().equals(caller.getUserId())) {
            String departmentName = departmentNames(Set.of(departmentId)).get(departmentId);
            notificationService.notify(
                    project.getCreatedByUserId(), NotificationType.PROJECT_RESPONDED,
                    "Phản hồi lời mời dự án",
                    departmentName + (accept ? " đã nhận" : " đã từ chối") + " tham gia \"" + project.getName() + "\"",
                    "PROJECT", project.getId());
        }
        return toDetail(project, caller);
    }

    @Override
    @Transactional
    public ProjectDetailResponse removeDepartment(Long projectId, Long departmentId, UserPrincipal caller) {
        ProjectEntity project = requireManageable(projectId, caller);
        ProjectDepartmentEntity row = projectDepartmentRepository.findActive(projectId, departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Project department", departmentId));
        if (row.getRole() == ProjectDepartmentRole.OWNER) {
            throw new BusinessException("OWNER_DEPARTMENT", "The owning department cannot be removed", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        row.markDeleted();
        memberRepository.findAllActiveByProjectId(projectId).stream()
                .filter(m -> departmentId.equals(m.getDepartmentId()))
                .forEach(ProjectMemberEntity::markDeleted);
        return toDetail(project, caller);
    }

    // ------------------------------------------------------------------- members

    @Override
    @Transactional
    public ProjectDetailResponse addMember(Long projectId, AddProjectMemberRequest request, UserPrincipal caller) {
        ProjectEntity project = requireViewable(projectId, caller);
        UserEntity user = userRepository.findActiveById(request.userId())
                .filter(u -> u.getCompanyId().equals(caller.getCompanyId()) && !u.isSystemAccount())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.userId()));
        PositionEntity position = positionRepository.findActiveByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.userId()));
        Long departmentId = position.getDepartmentId();

        boolean executive = caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE;
        if (!executive && !access.isHeadOf(caller, departmentId)) {
            throw new AccessDeniedException("You can only add people from your own department");
        }
        if (departmentId != null) {
            boolean taking = projectDepartmentRepository.findActive(projectId, departmentId)
                    .filter(d -> d.getStatus() == ProjectInviteStatus.ACCEPTED)
                    .isPresent();
            if (!taking) {
                throw new BusinessException(
                        "DEPARTMENT_NOT_IN_PROJECT", "That person's department has not accepted this project", HttpStatus.UNPROCESSABLE_ENTITY);
            }
        }
        if (access.isMember(projectId, user.getId())) {
            throw new BusinessException("ALREADY_MEMBER", "This person is already in the project", HttpStatus.CONFLICT);
        }

        memberRepository.save(new ProjectMemberEntity(projectId, user.getId(), departmentId, caller.getUserId()));
        if (!user.getId().equals(caller.getUserId())) {
            notificationService.notify(
                    user.getId(), NotificationType.PROJECT_MEMBER_ADDED, "Bạn được thêm vào dự án",
                    caller.getUsername() + " đã thêm bạn vào \"" + project.getName() + "\"", "PROJECT", projectId);
        }
        shareLinkedFoldersWith(projectId, List.of(user.getId()));
        return toDetail(project, caller);
    }

    @Override
    @Transactional
    public ProjectDetailResponse removeMember(Long projectId, Long userId, UserPrincipal caller) {
        ProjectEntity project = requireViewable(projectId, caller);
        ProjectMemberEntity member = memberRepository.findActive(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project member", userId));
        boolean allowed = userId.equals(caller.getUserId())
                || access.canManage(project, caller)
                || access.isHeadOf(caller, member.getDepartmentId());
        if (!allowed) {
            throw new AccessDeniedException("You cannot remove this person from the project");
        }
        member.markDeleted();
        return toDetail(project, caller);
    }

    // ------------------------------------------------------------------- folders

    @Override
    @Transactional
    public ProjectFolderLinkResponse linkFolder(Long projectId, LinkProjectFolderRequest request, UserPrincipal caller) {
        ProjectEntity project = requireManageable(projectId, caller);
        CatalogFolderResponse catalogFolder = driveCatalogService.requireShareableFolder(request.catalogFolderId(), caller);
        if (folderRepository.existsActive(projectId, catalogFolder.id())) {
            throw new BusinessException("FOLDER_ALREADY_LINKED", "This folder is already linked to the project", HttpStatus.CONFLICT);
        }
        ProjectFolderEntity link = folderRepository.save(new ProjectFolderEntity(projectId, catalogFolder.id(), caller.getUserId()));

        List<Long> memberIds = memberRepository.findAllActiveByProjectId(project.getId()).stream()
                .map(ProjectMemberEntity::getUserId).toList();
        FolderShareResult share = driveCatalogService.grantReaderAccess(catalogFolder.id(), memberIds);
        return new ProjectFolderLinkResponse(toFolderResponse(link, catalogFolder), share);
    }

    @Override
    @Transactional
    public ProjectDetailResponse unlinkFolder(Long projectId, Long linkId, UserPrincipal caller) {
        ProjectEntity project = requireManageable(projectId, caller);
        // Google permissions already granted stay in place: they are managed in Drive, not here.
        folderRepository.findActive(linkId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project folder", linkId))
                .markDeleted();
        return toDetail(project, caller);
    }

    private void shareLinkedFoldersWith(Long projectId, List<Long> userIds) {
        for (ProjectFolderEntity link : folderRepository.findAllActiveByProjectId(projectId)) {
            try {
                driveCatalogService.grantReaderAccess(link.getCatalogFolderId(), userIds);
            } catch (RuntimeException e) {
                // Adding the person must not fail because Drive is unavailable; they can still ask for access in Drive.
                log.warn("Could not share project folder {} with new member: {}", link.getCatalogFolderId(), e.getClass().getSimpleName());
            }
        }
    }

    // ---------------------------------------------------------------------- chat

    @Override
    @Transactional(readOnly = true)
    public List<ProjectMessageResponse> listMessages(Long projectId, UserPrincipal caller) {
        access.requireParticipant(projectId, caller);
        List<ProjectMessageEntity> latestFirst = messageRepository.findTop200ByProjectIdOrderByIdDesc(projectId);
        List<ProjectMessageEntity> oldestFirst = new ArrayList<>(latestFirst);
        Collections.reverse(oldestFirst);
        Map<Long, UserEntity> senders = userRepository.findAllById(
                        oldestFirst.stream().map(ProjectMessageEntity::getSenderId).distinct().toList())
                .stream().collect(Collectors.toMap(UserEntity::getId, Function.identity()));
        return oldestFirst.stream().map(m -> toMessageResponse(m, senders.get(m.getSenderId()))).toList();
    }

    @Override
    @Transactional
    public ProjectMessageResponse sendMessage(Long projectId, SendProjectMessageRequest request, UserPrincipal caller) {
        access.requireParticipant(projectId, caller);
        UserEntity sender = userRepository.findActiveById(caller.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", caller.getUserId()));
        ProjectMessageEntity saved = messageRepository.save(new ProjectMessageEntity(projectId, caller.getUserId(), request.body().trim()));
        return toMessageResponse(saved, sender);
    }

    // ------------------------------------------------------------------- helpers

    private ProjectEntity requireViewable(Long projectId, UserPrincipal caller) {
        ProjectEntity project = access.requireProject(projectId, caller);
        if (!access.canView(project, caller)) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        return project;
    }

    private ProjectEntity requireManageable(Long projectId, UserPrincipal caller) {
        ProjectEntity project = requireViewable(projectId, caller);
        if (!access.canManage(project, caller)) {
            throw new AccessDeniedException("Only an executive or the owning department's head can manage this project");
        }
        return project;
    }

    private boolean canRespond(UserPrincipal caller, Long departmentId) {
        return caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE || access.isHeadOf(caller, departmentId);
    }

    private DepartmentEntity requireOwnCompanyDepartment(Long departmentId, UserPrincipal caller) {
        return departmentRepository.findActiveById(departmentId)
                .filter(d -> d.getCompanyId().equals(caller.getCompanyId()))
                .orElseThrow(() -> new ResourceNotFoundException("Department", departmentId));
    }

    private void notifyDepartmentHeads(Long departmentId, ProjectEntity project, UserPrincipal caller) {
        positionRepository.findAllActiveByDepartmentId(departmentId).stream()
                .filter(p -> p.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD)
                .map(PositionEntity::getUserId)
                .filter(userId -> !userId.equals(caller.getUserId()))
                .forEach(userId -> notificationService.notify(
                        userId, NotificationType.PROJECT_INVITED, "Lời mời tham gia dự án",
                        caller.getUsername() + " mời phòng của bạn tham gia \"" + project.getName() + "\"",
                        "PROJECT", project.getId()));
    }

    private Map<Long, String> departmentNames(Set<Long> departmentIds) {
        return departmentRepository.findAllById(departmentIds).stream()
                .collect(Collectors.toMap(DepartmentEntity::getId, DepartmentEntity::getName));
    }

    private ProjectDetailResponse toDetail(ProjectEntity project, UserPrincipal caller) {
        Long projectId = project.getId();
        List<ProjectDepartmentEntity> departmentRows = projectDepartmentRepository.findAllActiveByProjectId(projectId);
        List<ProjectMemberEntity> memberRows = memberRepository.findAllActiveByProjectId(projectId);

        Set<Long> departmentIds = departmentRows.stream().map(ProjectDepartmentEntity::getDepartmentId).collect(Collectors.toSet());
        memberRows.stream().map(ProjectMemberEntity::getDepartmentId).filter(id -> id != null).forEach(departmentIds::add);
        Map<Long, String> names = departmentNames(departmentIds);

        List<ProjectDepartmentResponse> departments = departmentRows.stream()
                .map(d -> new ProjectDepartmentResponse(
                        d.getDepartmentId(), names.get(d.getDepartmentId()), d.getRole(), d.getStatus(), d.getNote(), d.getDecidedAt(),
                        (int) memberRows.stream().filter(m -> d.getDepartmentId().equals(m.getDepartmentId())).count()))
                .toList();

        List<Long> userIds = memberRows.stream().map(ProjectMemberEntity::getUserId).toList();
        Map<Long, UserEntity> users = userRepository.findAllActiveByIds(userIds).stream()
                .collect(Collectors.toMap(UserEntity::getId, Function.identity()));
        Map<Long, PositionEntity> positions = positionRepository.findAllActiveByUserIds(userIds).stream()
                .collect(Collectors.toMap(PositionEntity::getUserId, Function.identity(), (a, b) -> a));
        List<ProjectMemberResponse> members = memberRows.stream()
                .filter(m -> users.containsKey(m.getUserId()))
                .map(m -> {
                    UserEntity user = users.get(m.getUserId());
                    PositionEntity position = positions.get(m.getUserId());
                    return new ProjectMemberResponse(
                            user.getId(), user.getFullName(), position == null ? null : position.getTitle(), user.getEmail(),
                            m.getDepartmentId(), names.get(m.getDepartmentId()),
                            position == null ? AuthorityLevel.EMPLOYEE : position.getAuthorityLevel(),
                            avatarUrl(user), user.getPresenceStatus());
                })
                .toList();

        Map<Long, CatalogFolderResponse> catalog = driveCatalogService.listCatalog(caller).stream()
                .collect(Collectors.toMap(CatalogFolderResponse::id, Function.identity()));
        List<ProjectFolderResponse> folders = folderRepository.findAllActiveByProjectId(projectId).stream()
                .filter(link -> catalog.containsKey(link.getCatalogFolderId()))
                .map(link -> toFolderResponse(link, catalog.get(link.getCatalogFolderId())))
                .toList();

        List<Long> respondable = departmentRows.stream()
                .filter(d -> d.getStatus() == ProjectInviteStatus.INVITED && canRespond(caller, d.getDepartmentId()))
                .map(ProjectDepartmentEntity::getDepartmentId)
                .toList();
        boolean executive = caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE;
        List<Long> manageable = departmentRows.stream()
                .filter(d -> d.getStatus() == ProjectInviteStatus.ACCEPTED && (executive || access.isHeadOf(caller, d.getDepartmentId())))
                .map(ProjectDepartmentEntity::getDepartmentId)
                .toList();

        return new ProjectDetailResponse(
                projectId, project.getName(), project.getDescription(), project.getOwnerDepartmentId(),
                names.get(project.getOwnerDepartmentId()), departments, members, folders,
                access.canManage(project, caller), access.isMember(projectId, caller.getUserId()),
                access.isParticipant(project, caller), respondable, manageable);
    }

    private ProjectFolderResponse toFolderResponse(ProjectFolderEntity link, CatalogFolderResponse folder) {
        return new ProjectFolderResponse(
                link.getId(), folder.id(), folder.googleFolderName(), folder.departmentId(), folder.departmentName(), folder.googleFolderId());
    }

    private ProjectMessageResponse toMessageResponse(ProjectMessageEntity message, UserEntity sender) {
        return new ProjectMessageResponse(
                message.getId(), message.getSenderId(), sender == null ? null : sender.getFullName(),
                sender == null ? null : avatarUrl(sender), message.getBody(), message.getCreatedAt());
    }

    private static String avatarUrl(UserEntity user) {
        return user.getAvatarPath() == null ? null : "/users/" + user.getId() + "/avatar";
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }
}
