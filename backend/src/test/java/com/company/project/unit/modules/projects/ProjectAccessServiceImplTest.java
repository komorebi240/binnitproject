package com.company.project.unit.modules.projects;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.projects.domain.ProjectDepartmentEntity;
import com.company.project.modules.projects.domain.ProjectEntity;
import com.company.project.modules.projects.domain.ProjectMemberEntity;
import com.company.project.modules.projects.repository.ProjectDepartmentRepository;
import com.company.project.modules.projects.repository.ProjectMemberRepository;
import com.company.project.modules.projects.repository.ProjectRepository;
import com.company.project.modules.projects.service.impl.ProjectAccessServiceImpl;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.lang.reflect.Field;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/** Who may see and use a project: the rules every project screen and project task relies on. */
@ExtendWith(MockitoExtension.class)
class ProjectAccessServiceImplTest {

    private static final Long COMPANY = 1L;
    private static final Long OWNER_DEPT = 10L;
    private static final Long SUPPORT_DEPT = 20L;
    private static final Long PROJECT_ID = 50L;

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectDepartmentRepository departmentRepository;
    @Mock
    private ProjectMemberRepository memberRepository;

    private ProjectAccessServiceImpl access;
    private ProjectEntity project;

    @BeforeEach
    void setUp() {
        access = new ProjectAccessServiceImpl(projectRepository, departmentRepository, memberRepository);
        project = new ProjectEntity(COMPANY, "Launch", null, OWNER_DEPT, 1L);
        try {
            Field id = ProjectEntity.class.getDeclaredField("id");
            id.setAccessible(true);
            id.set(project, PROJECT_ID);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private UserPrincipal user(Long id, Long companyId, AuthorityLevel level, Long departmentId) {
        return new UserPrincipal(id, "u" + id, null, companyId, level, departmentId, null, true);
    }

    @Test
    void anotherCompanysProjectIsNotFound() {
        UserPrincipal foreignExecutive = user(9L, 999L, AuthorityLevel.EXECUTIVE, null);
        when(projectRepository.findActiveById(PROJECT_ID)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> access.requireProject(PROJECT_ID, foreignExecutive))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void executivesAndTheOwningHeadManageButOtherHeadsDoNot() {
        assertThat(access.canManage(project, user(1L, COMPANY, AuthorityLevel.EXECUTIVE, null))).isTrue();
        assertThat(access.canManage(project, user(2L, COMPANY, AuthorityLevel.DEPARTMENT_HEAD, OWNER_DEPT))).isTrue();
        assertThat(access.canManage(project, user(3L, COMPANY, AuthorityLevel.DEPARTMENT_HEAD, SUPPORT_DEPT))).isFalse();
        assertThat(access.canManage(project, user(4L, COMPANY, AuthorityLevel.EMPLOYEE, OWNER_DEPT))).isFalse();
    }

    @Test
    void anOrdinaryEmployeeOfTheOwningDepartmentIsNotAutomaticallyInTheProject() {
        UserPrincipal employee = user(4L, COMPANY, AuthorityLevel.EMPLOYEE, OWNER_DEPT);
        when(memberRepository.findActive(PROJECT_ID, 4L)).thenReturn(Optional.empty());

        assertThat(access.isParticipant(project, employee)).isFalse();
        assertThat(access.canView(project, employee)).isFalse();
    }

    @Test
    void anInvitedDepartmentsHeadCanSeeTheProjectButNotWorkInIt() {
        UserPrincipal supportHead = user(3L, COMPANY, AuthorityLevel.DEPARTMENT_HEAD, SUPPORT_DEPT);
        when(projectRepository.findActiveById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(memberRepository.findActive(PROJECT_ID, 3L)).thenReturn(Optional.empty());
        when(departmentRepository.findActive(PROJECT_ID, SUPPORT_DEPT))
                .thenReturn(Optional.of(ProjectDepartmentEntity.invite(PROJECT_ID, SUPPORT_DEPT, 1L, null)));

        assertThat(access.canView(project, supportHead)).isTrue();
        assertThat(access.isParticipant(project, supportHead)).isFalse();
        assertThatThrownBy(() -> access.requireParticipant(PROJECT_ID, supportHead)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void aMemberMayWorkButAStrangerLearnsNothing() {
        UserPrincipal member = user(5L, COMPANY, AuthorityLevel.EMPLOYEE, SUPPORT_DEPT);
        UserPrincipal stranger = user(6L, COMPANY, AuthorityLevel.EMPLOYEE, SUPPORT_DEPT);
        when(projectRepository.findActiveById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(memberRepository.findActive(PROJECT_ID, 5L))
                .thenReturn(Optional.of(new ProjectMemberEntity(PROJECT_ID, 5L, SUPPORT_DEPT, 1L)));
        when(memberRepository.findActive(PROJECT_ID, 6L)).thenReturn(Optional.empty());

        assertThat(access.requireParticipant(PROJECT_ID, member)).isSameAs(project);
        assertThatThrownBy(() -> access.requireParticipant(PROJECT_ID, stranger)).isInstanceOf(ResourceNotFoundException.class);
    }
}
