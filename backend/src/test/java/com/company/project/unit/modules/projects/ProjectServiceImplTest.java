package com.company.project.unit.modules.projects;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.NotificationType;
import com.company.project.common.exception.BusinessException;
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
import com.company.project.modules.projects.domain.ProjectEntity;
import com.company.project.modules.projects.domain.ProjectInviteStatus;
import com.company.project.modules.projects.domain.ProjectMemberEntity;
import com.company.project.modules.projects.dto.request.AddProjectMemberRequest;
import com.company.project.modules.projects.dto.request.CreateProjectRequest;
import com.company.project.modules.projects.dto.request.InviteDepartmentRequest;
import com.company.project.modules.projects.dto.request.LinkProjectFolderRequest;
import com.company.project.modules.projects.repository.ProjectDepartmentRepository;
import com.company.project.modules.projects.repository.ProjectFolderRepository;
import com.company.project.modules.projects.repository.ProjectMemberRepository;
import com.company.project.modules.projects.repository.ProjectMessageRepository;
import com.company.project.modules.projects.repository.ProjectRepository;
import com.company.project.modules.projects.service.ProjectAccessService;
import com.company.project.modules.projects.service.impl.ProjectServiceImpl;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** The cross-department project rules (who may start, invite, answer, add people, link folders). */
@ExtendWith(MockitoExtension.class)
class ProjectServiceImplTest {

    private static final Long COMPANY = 1L;
    private static final Long DEPT_ENGINEERING = 10L;
    private static final Long DEPT_SALES = 20L;
    private static final Long PROJECT_ID = 50L;

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectDepartmentRepository projectDepartmentRepository;
    @Mock
    private ProjectMemberRepository memberRepository;
    @Mock
    private ProjectFolderRepository folderRepository;
    @Mock
    private ProjectMessageRepository messageRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PositionRepository positionRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private DriveCatalogService driveCatalogService;
    @Mock
    private ProjectAccessService access;

    private ProjectServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ProjectServiceImpl(
                projectRepository, projectDepartmentRepository, memberRepository, folderRepository, messageRepository,
                departmentRepository, userRepository, positionRepository, notificationService, driveCatalogService, access);
    }

    private UserPrincipal principal(Long userId, AuthorityLevel level, Long departmentId) {
        return new UserPrincipal(userId, "user" + userId, null, COMPANY, level, departmentId, null, true);
    }

    private ProjectEntity project() {
        ProjectEntity project = new ProjectEntity(COMPANY, "Launch", null, DEPT_ENGINEERING, 1L);
        setId(project, PROJECT_ID);
        return project;
    }

    private DepartmentEntity department(Long id, Long companyId) {
        DepartmentEntity department = new DepartmentEntity(companyId, "Dept " + id);
        setId(department, id);
        return department;
    }

    /** A project the caller may open (so only the rule under test decides the outcome). */
    private ProjectEntity viewableProject(UserPrincipal caller) {
        ProjectEntity project = project();
        when(access.requireProject(PROJECT_ID, caller)).thenReturn(project);
        when(access.canView(project, caller)).thenReturn(true);
        return project;
    }

    // ------------------------------------------------------------------ create

    @Test
    void createProject_anEmployeeCannotStartOne() {
        UserPrincipal employee = principal(5L, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING);

        assertThatThrownBy(() -> service.createProject(new CreateProjectRequest("P", null, null, null, null), employee))
                .isInstanceOf(AccessDeniedException.class);
        verify(projectRepository, never()).save(any());
    }

    @Test
    void createProject_aDepartmentHeadCannotOwnAnotherDepartmentsProject() {
        UserPrincipal head = principal(2L, AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING);

        assertThatThrownBy(() -> service.createProject(new CreateProjectRequest("P", null, DEPT_SALES, null, null), head))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void createProject_anExecutiveMustSayWhichDepartmentOwnsIt() {
        UserPrincipal executive = principal(1L, AuthorityLevel.EXECUTIVE, null);

        assertThatThrownBy(() -> service.createProject(new CreateProjectRequest("P", null, null, null, null), executive))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ownerDepartmentId");
    }

    @Test
    void createProject_aDepartmentOfAnotherCompanyIsNotFound() {
        UserPrincipal head = principal(2L, AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING);
        when(departmentRepository.findActiveById(DEPT_ENGINEERING)).thenReturn(Optional.of(department(DEPT_ENGINEERING, COMPANY)));
        when(departmentRepository.findActiveById(DEPT_SALES)).thenReturn(Optional.of(department(DEPT_SALES, 999L)));

        assertThatThrownBy(() -> service.createProject(new CreateProjectRequest("P", null, null, List.of(DEPT_SALES), null), head))
                .isInstanceOf(com.company.project.common.exception.ResourceNotFoundException.class);
        verify(projectRepository, never()).save(any());
    }

    @Test
    void createProject_headStartsItAndTheInvitedDepartmentsHeadIsTold() {
        UserPrincipal head = principal(2L, AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING);
        when(departmentRepository.findActiveById(DEPT_ENGINEERING)).thenReturn(Optional.of(department(DEPT_ENGINEERING, COMPANY)));
        when(departmentRepository.findActiveById(DEPT_SALES)).thenReturn(Optional.of(department(DEPT_SALES, COMPANY)));
        when(projectRepository.save(any())).thenAnswer(inv -> {
            ProjectEntity saved = inv.getArgument(0);
            setId(saved, PROJECT_ID);
            return saved;
        });
        when(positionRepository.findAllActiveByDepartmentId(DEPT_SALES)).thenReturn(List.of(
                new PositionEntity(77L, AuthorityLevel.DEPARTMENT_HEAD, DEPT_SALES, null, null),
                new PositionEntity(78L, AuthorityLevel.EMPLOYEE, DEPT_SALES, null, null)));

        service.createProject(new CreateProjectRequest("Launch", null, null, List.of(DEPT_SALES, DEPT_ENGINEERING), "please help"), head);

        ArgumentCaptor<ProjectDepartmentEntity> rows = ArgumentCaptor.forClass(ProjectDepartmentEntity.class);
        verify(projectDepartmentRepository, org.mockito.Mockito.times(2)).save(rows.capture());
        assertThat(rows.getAllValues()).extracting(ProjectDepartmentEntity::getDepartmentId)
                .containsExactly(DEPT_ENGINEERING, DEPT_SALES);
        assertThat(rows.getAllValues().get(0).getStatus()).isEqualTo(ProjectInviteStatus.ACCEPTED);
        assertThat(rows.getAllValues().get(1).getStatus()).isEqualTo(ProjectInviteStatus.INVITED);
        verify(notificationService).notify(
                eq(77L), eq(NotificationType.PROJECT_INVITED), anyString(), anyString(), eq("PROJECT"), eq(PROJECT_ID));
        verify(notificationService, never()).notify(eq(78L), any(), anyString(), anyString(), anyString(), anyLong());
        verify(memberRepository).save(any(ProjectMemberEntity.class));
    }

    // -------------------------------------------------------------- invitations

    @Test
    void inviteDepartment_aDepartmentAlreadyTakingPartCannotBeInvitedAgain() {
        UserPrincipal head = principal(2L, AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING);
        ProjectEntity project = viewableProject(head);
        when(access.canManage(project, head)).thenReturn(true);
        when(departmentRepository.findActiveById(DEPT_SALES)).thenReturn(Optional.of(department(DEPT_SALES, COMPANY)));
        ProjectDepartmentEntity row = ProjectDepartmentEntity.invite(PROJECT_ID, DEPT_SALES, 2L, null);
        row.decide(true, 77L);
        when(projectDepartmentRepository.findActive(PROJECT_ID, DEPT_SALES)).thenReturn(Optional.of(row));

        assertThatThrownBy(() -> service.inviteDepartment(PROJECT_ID, new InviteDepartmentRequest(DEPT_SALES, null), head))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already");
    }

    @Test
    void inviteDepartment_aDeclinedDepartmentCanBeInvitedAgain() {
        UserPrincipal head = principal(2L, AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING);
        ProjectEntity project = viewableProject(head);
        when(access.canManage(project, head)).thenReturn(true);
        when(departmentRepository.findActiveById(DEPT_SALES)).thenReturn(Optional.of(department(DEPT_SALES, COMPANY)));
        ProjectDepartmentEntity row = ProjectDepartmentEntity.invite(PROJECT_ID, DEPT_SALES, 2L, null);
        row.decide(false, 77L);
        when(projectDepartmentRepository.findActive(PROJECT_ID, DEPT_SALES)).thenReturn(Optional.of(row));

        service.inviteDepartment(PROJECT_ID, new InviteDepartmentRequest(DEPT_SALES, "round two"), head);

        assertThat(row.getStatus()).isEqualTo(ProjectInviteStatus.INVITED);
        assertThat(row.getNote()).isEqualTo("round two");
    }

    @Test
    void inviteDepartment_onlyManagersMayInvite() {
        UserPrincipal member = principal(5L, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING);
        ProjectEntity project = viewableProject(member);
        when(access.canManage(project, member)).thenReturn(false);

        assertThatThrownBy(() -> service.inviteDepartment(PROJECT_ID, new InviteDepartmentRequest(DEPT_SALES, null), member))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void respondToInvitation_onlyThatDepartmentsHeadMayAnswer() {
        UserPrincipal otherHead = principal(3L, AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING);
        viewableProject(otherHead);
        when(projectDepartmentRepository.findActive(PROJECT_ID, DEPT_SALES))
                .thenReturn(Optional.of(ProjectDepartmentEntity.invite(PROJECT_ID, DEPT_SALES, 2L, null)));
        when(access.isHeadOf(otherHead, DEPT_SALES)).thenReturn(false);

        assertThatThrownBy(() -> service.respondToInvitation(PROJECT_ID, DEPT_SALES, true, otherHead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void respondToInvitation_acceptingTellsTheProjectCreator() {
        UserPrincipal salesHead = principal(77L, AuthorityLevel.DEPARTMENT_HEAD, DEPT_SALES);
        viewableProject(salesHead);
        ProjectDepartmentEntity invitation = ProjectDepartmentEntity.invite(PROJECT_ID, DEPT_SALES, 1L, null);
        when(projectDepartmentRepository.findActive(PROJECT_ID, DEPT_SALES)).thenReturn(Optional.of(invitation));
        when(access.isHeadOf(salesHead, DEPT_SALES)).thenReturn(true);

        service.respondToInvitation(PROJECT_ID, DEPT_SALES, true, salesHead);

        assertThat(invitation.getStatus()).isEqualTo(ProjectInviteStatus.ACCEPTED);
        verify(notificationService).notify(
                eq(1L), eq(NotificationType.PROJECT_RESPONDED), anyString(), anyString(), eq("PROJECT"), eq(PROJECT_ID));
    }

    @Test
    void respondToInvitation_anAnsweredInvitationCannotBeAnsweredTwice() {
        UserPrincipal salesHead = principal(77L, AuthorityLevel.DEPARTMENT_HEAD, DEPT_SALES);
        viewableProject(salesHead);
        ProjectDepartmentEntity invitation = ProjectDepartmentEntity.invite(PROJECT_ID, DEPT_SALES, 1L, null);
        invitation.decide(false, 77L);
        when(projectDepartmentRepository.findActive(PROJECT_ID, DEPT_SALES)).thenReturn(Optional.of(invitation));
        when(access.isHeadOf(salesHead, DEPT_SALES)).thenReturn(true);

        assertThatThrownBy(() -> service.respondToInvitation(PROJECT_ID, DEPT_SALES, true, salesHead))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already answered");
    }

    // ------------------------------------------------------------------ members

    private UserEntity userInDepartment(Long userId, Long departmentId) {
        UserEntity user = new UserEntity(COMPANY, "u" + userId, "hash", "User " + userId, "u" + userId + "@x.test");
        setId(user, userId);
        when(userRepository.findActiveById(userId)).thenReturn(Optional.of(user));
        when(positionRepository.findActiveByUserId(userId))
                .thenReturn(Optional.of(new PositionEntity(userId, AuthorityLevel.EMPLOYEE, departmentId, null, null)));
        return user;
    }

    @Test
    void addMember_aHeadCanOnlyAddPeopleOfTheirOwnDepartment() {
        UserPrincipal engineeringHead = principal(2L, AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING);
        viewableProject(engineeringHead);
        userInDepartment(90L, DEPT_SALES);
        when(access.isHeadOf(engineeringHead, DEPT_SALES)).thenReturn(false);

        assertThatThrownBy(() -> service.addMember(PROJECT_ID, new AddProjectMemberRequest(90L), engineeringHead))
                .isInstanceOf(AccessDeniedException.class);
        verify(memberRepository, never()).save(any());
    }

    @Test
    void addMember_theDepartmentMustHaveAcceptedTheProjectFirst() {
        UserPrincipal salesHead = principal(77L, AuthorityLevel.DEPARTMENT_HEAD, DEPT_SALES);
        viewableProject(salesHead);
        userInDepartment(90L, DEPT_SALES);
        when(access.isHeadOf(salesHead, DEPT_SALES)).thenReturn(true);
        when(projectDepartmentRepository.findActive(PROJECT_ID, DEPT_SALES))
                .thenReturn(Optional.of(ProjectDepartmentEntity.invite(PROJECT_ID, DEPT_SALES, 1L, null)));

        assertThatThrownBy(() -> service.addMember(PROJECT_ID, new AddProjectMemberRequest(90L), salesHead))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not accepted");
    }

    @Test
    void addMember_headAddsOwnPersonAfterAcceptingAndTheyAreToldAndGetTheFolders() {
        UserPrincipal salesHead = principal(77L, AuthorityLevel.DEPARTMENT_HEAD, DEPT_SALES);
        viewableProject(salesHead);
        userInDepartment(90L, DEPT_SALES);
        when(access.isHeadOf(salesHead, DEPT_SALES)).thenReturn(true);
        ProjectDepartmentEntity accepted = ProjectDepartmentEntity.invite(PROJECT_ID, DEPT_SALES, 1L, null);
        accepted.decide(true, 77L);
        when(projectDepartmentRepository.findActive(PROJECT_ID, DEPT_SALES)).thenReturn(Optional.of(accepted));
        when(access.isMember(PROJECT_ID, 90L)).thenReturn(false);
        com.company.project.modules.projects.domain.ProjectFolderEntity linked =
                new com.company.project.modules.projects.domain.ProjectFolderEntity(PROJECT_ID, 300L, 1L);
        when(folderRepository.findAllActiveByProjectId(PROJECT_ID)).thenReturn(List.of(linked));

        service.addMember(PROJECT_ID, new AddProjectMemberRequest(90L), salesHead);

        verify(memberRepository).save(any(ProjectMemberEntity.class));
        verify(notificationService).notify(
                eq(90L), eq(NotificationType.PROJECT_MEMBER_ADDED), anyString(), anyString(), eq("PROJECT"), eq(PROJECT_ID));
        verify(driveCatalogService).grantReaderAccess(300L, List.of(90L));
    }

    @Test
    void addMember_aPersonAlreadyInTheProjectIsAConflict() {
        UserPrincipal executive = principal(1L, AuthorityLevel.EXECUTIVE, null);
        viewableProject(executive);
        userInDepartment(90L, DEPT_SALES);
        ProjectDepartmentEntity accepted = ProjectDepartmentEntity.invite(PROJECT_ID, DEPT_SALES, 1L, null);
        accepted.decide(true, 77L);
        when(projectDepartmentRepository.findActive(PROJECT_ID, DEPT_SALES)).thenReturn(Optional.of(accepted));
        when(access.isMember(PROJECT_ID, 90L)).thenReturn(true);

        assertThatThrownBy(() -> service.addMember(PROJECT_ID, new AddProjectMemberRequest(90L), executive))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already in the project");
    }

    @Test
    void removeMember_someoneElsesMembershipIsNotYoursToEnd() {
        UserPrincipal employee = principal(5L, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING);
        ProjectEntity project = viewableProject(employee);
        when(memberRepository.findActive(PROJECT_ID, 90L))
                .thenReturn(Optional.of(new ProjectMemberEntity(PROJECT_ID, 90L, DEPT_SALES, 1L)));
        when(access.canManage(project, employee)).thenReturn(false);
        when(access.isHeadOf(employee, DEPT_SALES)).thenReturn(false);

        assertThatThrownBy(() -> service.removeMember(PROJECT_ID, 90L, employee)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void removeMember_youCanAlwaysLeaveYourself() {
        UserPrincipal employee = principal(5L, AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING);
        viewableProject(employee);
        ProjectMemberEntity membership = new ProjectMemberEntity(PROJECT_ID, 5L, DEPT_ENGINEERING, 1L);
        when(memberRepository.findActive(PROJECT_ID, 5L)).thenReturn(Optional.of(membership));

        service.removeMember(PROJECT_ID, 5L, employee);

        assertThat(membership.isDeleted()).isTrue();
    }

    // ------------------------------------------------------------------ folders

    @Test
    void linkFolder_sharesTheFolderWithEveryCurrentMember() {
        UserPrincipal executive = principal(1L, AuthorityLevel.EXECUTIVE, null);
        ProjectEntity project = viewableProject(executive);
        when(access.canManage(project, executive)).thenReturn(true);
        CatalogFolderResponse folder = new CatalogFolderResponse(300L, DEPT_ENGINEERING, "Dept 10", "gid", "Specs");
        when(driveCatalogService.requireShareableFolder(300L, executive)).thenReturn(folder);
        when(folderRepository.existsActive(PROJECT_ID, 300L)).thenReturn(false);
        when(folderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(memberRepository.findAllActiveByProjectId(PROJECT_ID)).thenReturn(List.of(
                new ProjectMemberEntity(PROJECT_ID, 1L, null, 1L), new ProjectMemberEntity(PROJECT_ID, 90L, DEPT_SALES, 1L)));
        when(driveCatalogService.grantReaderAccess(300L, List.of(1L, 90L))).thenReturn(new FolderShareResult(1, 1, 0));

        var result = service.linkFolder(PROJECT_ID, new LinkProjectFolderRequest(300L), executive);

        assertThat(result.share().granted()).isEqualTo(1);
        assertThat(result.share().notConnected()).isEqualTo(1);
        assertThat(result.folder().folderName()).isEqualTo("Specs");
    }

    @Test
    void linkFolder_aFolderYouMayNotShareIsRefusedBeforeAnythingIsSaved() {
        UserPrincipal head = principal(2L, AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING);
        ProjectEntity project = viewableProject(head);
        when(access.canManage(project, head)).thenReturn(true);
        when(driveCatalogService.requireShareableFolder(400L, head)).thenThrow(new AccessDeniedException("not yours"));

        assertThatThrownBy(() -> service.linkFolder(PROJECT_ID, new LinkProjectFolderRequest(400L), head))
                .isInstanceOf(AccessDeniedException.class);
        verify(folderRepository, never()).save(any());
        verify(driveCatalogService, never()).grantReaderAccess(anyLong(), any());
    }

    private static void setId(Object entity, Long id) {
        try {
            Field field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
