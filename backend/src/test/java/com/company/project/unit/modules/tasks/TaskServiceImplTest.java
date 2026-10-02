package com.company.project.unit.modules.tasks;

import com.company.project.common.AssigneeType;
import com.company.project.common.AuthorityLevel;
import com.company.project.common.TaskPriority;
import com.company.project.common.TaskStatus;
import com.company.project.common.storage.AttachmentStorage;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.tasks.domain.TaskAttachmentEntity;
import com.company.project.modules.tasks.domain.TaskEntity;
import com.company.project.modules.tasks.dto.request.CreateTaskRequest;
import com.company.project.modules.tasks.repository.TaskAttachmentRepository;
import com.company.project.modules.tasks.repository.TaskRepository;
import com.company.project.modules.tasks.service.impl.TaskServiceImpl;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the assignment hierarchy and status-transition rules from the Phase 2 plan - the
 * same rules were also exercised by hand via curl/browser (see backend/README.md "Verified"),
 * this turns the trickiest ones into fast regression coverage.
 */
@ExtendWith(MockitoExtension.class)
class TaskServiceImplTest {

    private static final Long COMPANY_A = 1L;
    private static final Long DEPT_ENGINEERING = 10L;
    private static final Long DEPT_SALES = 20L;
    private static final Long TEAM_BACKEND = 100L;
    private static final Long EMPLOYEE_IN_ENGINEERING = 5L;
    private static final Long EMPLOYEE_IN_SALES = 6L;

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private PositionRepository positionRepository;
    @Mock
    private TaskAttachmentRepository attachmentRepository;
    @Mock
    private AttachmentStorage attachmentStorage;

    private TaskServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new TaskServiceImpl(
                taskRepository, userRepository, departmentRepository, positionRepository, attachmentRepository, attachmentStorage);
    }

    private UserPrincipal principal(AuthorityLevel level, Long departmentId, Long teamId) {
        return new UserPrincipal(1L, "caller", null, COMPANY_A, level, departmentId, teamId, true);
    }

    private UserEntity activeUser(Long companyId) {
        UserEntity user = new UserEntity(companyId, "target", "hash", "Target User", null);
        setId(user, EMPLOYEE_IN_ENGINEERING);
        return user;
    }

    @Test
    void createTask_departmentHeadCannotAssignToOtherDepartmentMember() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);
        CreateTaskRequest request = new CreateTaskRequest(
                "Do the thing", null, AssigneeType.USER, EMPLOYEE_IN_SALES, null, null, null, null);

        UserEntity targetUser = new UserEntity(COMPANY_A, "salesperson", "hash", "Sales Person", null);
        setId(targetUser, EMPLOYEE_IN_SALES);
        when(userRepository.findActiveById(EMPLOYEE_IN_SALES)).thenReturn(Optional.of(targetUser));
        when(positionRepository.findActiveByUserId(EMPLOYEE_IN_SALES))
                .thenReturn(Optional.of(new PositionEntity(EMPLOYEE_IN_SALES, AuthorityLevel.EMPLOYEE, DEPT_SALES, null, null)));

        assertThatThrownBy(() -> service.createTask(request, deptHead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void createTask_teamLeadCannotAssignToWholeDepartment() {
        UserPrincipal teamLead = principal(AuthorityLevel.TEAM_LEAD, DEPT_ENGINEERING, TEAM_BACKEND);
        CreateTaskRequest request = new CreateTaskRequest(
                "Do the thing", null, AssigneeType.DEPARTMENT, null, DEPT_ENGINEERING, null, null, null);

        DepartmentEntity department = new DepartmentEntity(COMPANY_A, "Engineering");
        setId(department, DEPT_ENGINEERING);
        when(departmentRepository.findActiveById(DEPT_ENGINEERING)).thenReturn(Optional.of(department));

        assertThatThrownBy(() -> service.createTask(request, teamLead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void createTask_executiveCanAssignToAnyDepartmentInOwnCompany() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        CreateTaskRequest request = new CreateTaskRequest(
                "Ship it", "details", AssigneeType.DEPARTMENT, null, DEPT_SALES, TaskPriority.HIGH, null, null);

        DepartmentEntity department = new DepartmentEntity(COMPANY_A, "Sales");
        setId(department, DEPT_SALES);
        when(departmentRepository.findActiveById(DEPT_SALES)).thenReturn(Optional.of(department));
        when(taskRepository.save(any())).thenAnswer(inv -> {
            TaskEntity t = inv.getArgument(0);
            setId(t, 77L);
            return t;
        });

        var response = service.createTask(request, executive);

        assertThat(response.assigneeType()).isEqualTo(AssigneeType.DEPARTMENT);
        assertThat(response.assigneeDepartmentId()).isEqualTo(DEPT_SALES);
        assertThat(response.priority()).isEqualTo(TaskPriority.HIGH);
    }

    @Test
    void createTask_employeeCanAssignTaskToThemselves() {
        UserPrincipal employee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        CreateTaskRequest request = new CreateTaskRequest(
                "My own task", null, AssigneeType.USER, employee.getUserId(), null, null, null, null);

        UserEntity self = new UserEntity(COMPANY_A, "me", "hash", "Me", null);
        setId(self, employee.getUserId());
        when(userRepository.findActiveById(employee.getUserId())).thenReturn(Optional.of(self));
        when(taskRepository.save(any())).thenAnswer(inv -> {
            TaskEntity t = inv.getArgument(0);
            setId(t, 88L);
            return t;
        });

        var response = service.createTask(request, employee);

        assertThat(response.assigneeUserId()).isEqualTo(employee.getUserId());
    }

    @Test
    void acceptTask_onlyTheAssigneeMayAccept() {
        UserPrincipal someoneElse = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Do it", null, AssigneeType.USER, 999L, null, 2L, TaskPriority.MEDIUM, null);
        setId(task, 5L);
        when(taskRepository.findActiveById(5L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.acceptTask(5L, someoneElse))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void completeTask_beforeAcceptFails() {
        UserPrincipal assignee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Do it", null, AssigneeType.USER, assignee.getUserId(), null, 2L, TaskPriority.MEDIUM, null);
        setId(task, 5L);
        when(taskRepository.findActiveById(5L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.completeTask(5L, assignee))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ASSIGNED");
    }

    @Test
    void acceptTask_departmentHeadCanAcceptOnBehalfOfOwnDepartment() {
        UserPrincipal deptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Team-wide task", null, AssigneeType.DEPARTMENT, null, DEPT_ENGINEERING, 2L, TaskPriority.MEDIUM, null);
        setId(task, 6L);
        when(taskRepository.findActiveById(6L)).thenReturn(Optional.of(task));

        var response = service.acceptTask(6L, deptHead);

        assertThat(response.status()).isEqualTo(TaskStatus.ACCEPTED);
    }

    @Test
    void acceptTask_regularEmployeeCannotAcceptOnBehalfOfDepartment() {
        UserPrincipal employee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Team-wide task", null, AssigneeType.DEPARTMENT, null, DEPT_ENGINEERING, 2L, TaskPriority.MEDIUM, null);
        setId(task, 6L);
        when(taskRepository.findActiveById(6L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.acceptTask(6L, employee))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void restoreTask_onlyWorksOnACancelledTask() {
        UserPrincipal assigner = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Still open", null, AssigneeType.USER, 999L, null, assigner.getUserId(), TaskPriority.MEDIUM, null);
        setId(task, 9L);
        when(taskRepository.findActiveById(9L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.restoreTask(9L, assigner))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ASSIGNED");
    }

    @Test
    void restoreTask_putsACancelledTaskBackToAssigned() {
        UserPrincipal assigner = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Cancelled one", null, AssigneeType.USER, 999L, null, assigner.getUserId(), TaskPriority.MEDIUM, null);
        task.cancel();
        setId(task, 9L);
        when(taskRepository.findActiveById(9L)).thenReturn(Optional.of(task));

        var response = service.restoreTask(9L, assigner);

        assertThat(response.status()).isEqualTo(TaskStatus.ASSIGNED);
    }

    @Test
    void restoreTask_onlyTheOriginalAssignerOrAnAuthorizedManagerMayRestore() {
        UserPrincipal someoneElse = principal(AuthorityLevel.EMPLOYEE, DEPT_SALES, null);
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Cancelled one", null, AssigneeType.USER, 999L, null, 2L, TaskPriority.MEDIUM, null);
        task.cancel();
        setId(task, 9L);
        when(taskRepository.findActiveById(9L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.restoreTask(9L, someoneElse))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void deleteTask_onlyWorksOnACancelledTask() {
        UserPrincipal assigner = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Still open", null, AssigneeType.USER, 999L, null, assigner.getUserId(), TaskPriority.MEDIUM, null);
        setId(task, 9L);
        when(taskRepository.findActiveById(9L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.deleteTask(9L, assigner))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ASSIGNED");
        assertThat(task.isDeleted()).isFalse();
    }

    @Test
    void deleteTask_softDeletesACancelledTask() {
        UserPrincipal assigner = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Cancelled one", null, AssigneeType.USER, 999L, null, assigner.getUserId(), TaskPriority.MEDIUM, null);
        task.cancel();
        setId(task, 9L);
        when(taskRepository.findActiveById(9L)).thenReturn(Optional.of(task));

        service.deleteTask(9L, assigner);

        assertThat(task.isDeleted()).isTrue();
    }

    // ---------------------------------------------------------------- attachments / Drive link

    private static final Long CALLER_ID = 1L;
    private static final Long OTHER_USER = 2L;
    private static final Long UNRELATED_USER = 9L;

    private TaskEntity userTask(Long taskId, Long assignedBy, Long assigneeUserId, Long companyId) {
        TaskEntity task = new TaskEntity(
                companyId, "Do it", null, AssigneeType.USER, assigneeUserId, null, assignedBy, TaskPriority.MEDIUM, null);
        setId(task, taskId);
        when(taskRepository.findActiveById(taskId)).thenReturn(Optional.of(task));
        return task;
    }

    private TaskEntity departmentTask(Long taskId, Long departmentId) {
        TaskEntity task = new TaskEntity(
                COMPANY_A, "Team-wide", null, AssigneeType.DEPARTMENT, null, departmentId, OTHER_USER, TaskPriority.MEDIUM, null);
        setId(task, taskId);
        when(taskRepository.findActiveById(taskId)).thenReturn(Optional.of(task));
        return task;
    }

    private MockMultipartFile pdf() {
        return new MockMultipartFile("file", "spec.pdf", "application/pdf", "%PDF-1.4 x".getBytes());
    }

    private AttachmentStorage.Stored storedPdf() {
        return new AttachmentStorage.Stored("uuid.pdf", "spec.pdf", "application/pdf", 10L, false);
    }

    private TaskAttachmentEntity attachmentOf(Long attachmentId, Long taskId, Long uploadedBy) {
        TaskAttachmentEntity a = new TaskAttachmentEntity(taskId, "uuid.pdf", "spec.pdf", "application/pdf", 10L, false, uploadedBy);
        setId(a, attachmentId);
        return a;
    }

    @Test
    void addAttachment_theAssigneeMayAddAFile() {
        UserPrincipal assignee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        userTask(5L, OTHER_USER, CALLER_ID, COMPANY_A);
        when(attachmentStorage.store(any())).thenReturn(storedPdf());

        service.addAttachment(5L, pdf(), assignee);

        verify(attachmentRepository).save(any(TaskAttachmentEntity.class));
    }

    @Test
    void addAttachment_unrelatedEmployeeSeesNothing() {
        UserPrincipal outsider = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        userTask(5L, OTHER_USER, UNRELATED_USER, COMPANY_A);

        assertThatThrownBy(() -> service.addAttachment(5L, pdf(), outsider))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(attachmentStorage, never()).store(any());
    }

    @Test
    void addAttachment_crossCompanyTaskIsNotFound() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null, null);
        userTask(5L, OTHER_USER, UNRELATED_USER, 999L);

        assertThatThrownBy(() -> service.addAttachment(5L, pdf(), executive))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void addAttachment_aDepartmentMemberCanSeeTheTaskButNotChangeIt() {
        UserPrincipal member = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        departmentTask(6L, DEPT_ENGINEERING);

        assertThatThrownBy(() -> service.addAttachment(6L, pdf(), member))
                .isInstanceOf(AccessDeniedException.class);
        verify(attachmentStorage, never()).store(any());
    }

    @Test
    void addAttachment_theDepartmentHeadMayAddToADepartmentTask() {
        UserPrincipal head = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING, null);
        departmentTask(6L, DEPT_ENGINEERING);
        when(attachmentStorage.store(any())).thenReturn(storedPdf());

        service.addAttachment(6L, pdf(), head);

        verify(attachmentRepository).save(any(TaskAttachmentEntity.class));
    }

    @Test
    void addAttachment_cancelledTaskIsRejected() {
        UserPrincipal assignee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        TaskEntity task = userTask(5L, OTHER_USER, CALLER_ID, COMPANY_A);
        task.cancel();

        assertThatThrownBy(() -> service.addAttachment(5L, pdf(), assignee))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cancelled");
    }

    @Test
    void addAttachment_tenFilesIsTheLimit() {
        UserPrincipal assignee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        userTask(5L, OTHER_USER, CALLER_ID, COMPANY_A);
        when(attachmentRepository.countByTaskId(5L)).thenReturn(10L);

        assertThatThrownBy(() -> service.addAttachment(5L, pdf(), assignee))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("at most 10");
        verify(attachmentStorage, never()).store(any());
    }

    @Test
    void addAttachment_failedDbWriteDeletesTheStoredFile() {
        UserPrincipal assignee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        userTask(5L, OTHER_USER, CALLER_ID, COMPANY_A);
        when(attachmentStorage.store(any())).thenReturn(storedPdf());
        when(attachmentRepository.save(any())).thenThrow(new IllegalStateException("db down"));

        assertThatThrownBy(() -> service.addAttachment(5L, pdf(), assignee))
                .isInstanceOf(IllegalStateException.class);
        verify(attachmentStorage).delete("uuid.pdf");
    }

    @Test
    void removeAttachment_uploaderMayRemoveAndTheFileIsDeleted() {
        UserPrincipal assignee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        userTask(5L, OTHER_USER, CALLER_ID, COMPANY_A);
        TaskAttachmentEntity attachment = attachmentOf(7L, 5L, CALLER_ID);
        when(attachmentRepository.findById(7L)).thenReturn(Optional.of(attachment));

        service.removeAttachment(5L, 7L, assignee);

        verify(attachmentRepository).delete(attachment);
        verify(attachmentStorage).delete("uuid.pdf");
    }

    @Test
    void removeAttachment_aMemberWhoIsNeitherUploaderNorManagerIsRefused() {
        UserPrincipal member = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        departmentTask(6L, DEPT_ENGINEERING);
        when(attachmentRepository.findById(7L)).thenReturn(Optional.of(attachmentOf(7L, 6L, OTHER_USER)));

        assertThatThrownBy(() -> service.removeAttachment(6L, 7L, member))
                .isInstanceOf(AccessDeniedException.class);
        verify(attachmentStorage, never()).delete(any());
    }

    @Test
    void removeAttachment_anAttachmentOfAnotherTaskIsNotFound() {
        UserPrincipal assignee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        userTask(5L, OTHER_USER, CALLER_ID, COMPANY_A);
        when(attachmentRepository.findById(7L)).thenReturn(Optional.of(attachmentOf(7L, 99L, CALLER_ID)));

        assertThatThrownBy(() -> service.removeAttachment(5L, 7L, assignee))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void loadAttachment_visibleCallerGetsTheFileAndOutsiderGetsNotFound() {
        UserPrincipal assignee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        userTask(5L, OTHER_USER, CALLER_ID, COMPANY_A);
        when(attachmentRepository.findById(7L)).thenReturn(Optional.of(attachmentOf(7L, 5L, OTHER_USER)));
        when(attachmentStorage.load("uuid.pdf"))
                .thenReturn(new AttachmentStorage.Resolved(new java.io.ByteArrayInputStream(new byte[0]), 10L));

        assertThat(service.loadAttachment(5L, 7L, assignee).fileName()).isEqualTo("spec.pdf");

        TaskEntity hidden = userTask(8L, OTHER_USER, UNRELATED_USER, COMPANY_A);
        assertThat(hidden).isNotNull();
        assertThatThrownBy(() -> service.loadAttachment(8L, 7L, assignee))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateDriveUrl_acceptsAGoogleDriveLinkAndClearsOnBlank() {
        UserPrincipal assignee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        userTask(5L, OTHER_USER, CALLER_ID, COMPANY_A);

        var set = service.updateDriveUrl(5L, "  https://drive.google.com/file/d/abc/view  ", assignee);
        assertThat(set.driveUrl()).isEqualTo("https://drive.google.com/file/d/abc/view");

        var cleared = service.updateDriveUrl(5L, "   ", assignee);
        assertThat(cleared.driveUrl()).isNull();
    }

    @Test
    void updateDriveUrl_rejectsUnsafeLinks() {
        UserPrincipal assignee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        userTask(5L, OTHER_USER, CALLER_ID, COMPANY_A);

        assertThatThrownBy(() -> service.updateDriveUrl(5L, "javascript:alert(1)", assignee)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.updateDriveUrl(5L, "https://evil.example.com/drive.google.com", assignee))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void updateDriveUrl_aNonManagerIsRefused() {
        UserPrincipal member = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        departmentTask(6L, DEPT_ENGINEERING);

        assertThatThrownBy(() -> service.updateDriveUrl(6L, "https://drive.google.com/x", member))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void createTask_rejectsABadDriveLinkBeforeSavingAnything() {
        UserPrincipal employee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING, null);
        CreateTaskRequest request = new CreateTaskRequest(
                "Mine", null, AssigneeType.USER, employee.getUserId(), null, null, null, "http://drive.google.com/insecure");
        UserEntity self = new UserEntity(COMPANY_A, "me", "hash", "Me", null);
        setId(self, employee.getUserId());
        when(userRepository.findActiveById(employee.getUserId())).thenReturn(Optional.of(self));

        assertThatThrownBy(() -> service.createTask(request, employee)).isInstanceOf(BusinessException.class);
        verify(taskRepository, never()).save(any());
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
