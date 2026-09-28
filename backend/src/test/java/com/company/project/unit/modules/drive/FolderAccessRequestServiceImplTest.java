package com.company.project.unit.modules.drive;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.FolderRequestStatus;
import com.company.project.common.exception.BusinessException;
import com.company.project.modules.drive.domain.DepartmentDriveFolderEntity;
import com.company.project.modules.drive.domain.FolderAccessRequestEntity;
import com.company.project.modules.drive.dto.request.CreateFolderAccessRequest;
import com.company.project.modules.drive.repository.DepartmentDriveFolderRepository;
import com.company.project.modules.drive.repository.FolderAccessRequestRepository;
import com.company.project.modules.drive.service.DriveConnectionService;
import com.company.project.modules.drive.service.GoogleDriveClient;
import com.company.project.modules.drive.service.impl.FolderAccessRequestServiceImpl;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Covers the approval-authority and status-transition rules from the Phase 3 plan — the same
 * cases (TC-26 through TC-28) were also exercised for real via curl during manual testing.
 */
@ExtendWith(MockitoExtension.class)
class FolderAccessRequestServiceImplTest {

    private static final Long COMPANY_A = 1L;
    private static final Long DEPT_ENGINEERING = 10L;
    private static final Long DEPT_MARKETING = 20L;

    @Mock
    private FolderAccessRequestRepository requestRepository;
    @Mock
    private DepartmentDriveFolderRepository catalogRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DriveConnectionService driveConnectionService;
    @Mock
    private GoogleDriveClient googleDriveClient;

    private FolderAccessRequestServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new FolderAccessRequestServiceImpl(
                requestRepository, catalogRepository, departmentRepository, userRepository,
                driveConnectionService, googleDriveClient);
    }

    private UserPrincipal principal(AuthorityLevel level, Long departmentId) {
        return new UserPrincipal(1L, "caller", null, COMPANY_A, level, departmentId, null, true);
    }

    private DepartmentDriveFolderEntity marketingFolder() {
        DepartmentDriveFolderEntity folder = new DepartmentDriveFolderEntity(
                COMPANY_A, DEPT_MARKETING, 9L, "folder-abc", "Marketing Reports");
        setId(folder, 1L);
        return folder;
    }

    @Test
    void createRequest_ownDepartmentFolder_throwsBusinessException() {
        UserPrincipal caller = principal(AuthorityLevel.EMPLOYEE, DEPT_MARKETING);
        DepartmentDriveFolderEntity folder = marketingFolder();
        when(catalogRepository.findActiveById(1L)).thenReturn(Optional.of(folder));

        assertThatThrownBy(() -> service.createRequest(new CreateFolderAccessRequest(1L, null), caller))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("own department");
    }

    @Test
    void approveRequest_wrongDepartmentHead_throwsAccessDenied() {
        UserPrincipal wrongDeptHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_ENGINEERING);
        FolderAccessRequestEntity request = new FolderAccessRequestEntity(COMPANY_A, 1L, 2L, DEPT_ENGINEERING, null);
        setId(request, 5L);
        when(requestRepository.findActiveById(5L)).thenReturn(Optional.of(request));
        when(catalogRepository.findActiveById(1L)).thenReturn(Optional.of(marketingFolder()));

        assertThatThrownBy(() -> service.approveRequest(5L, wrongDeptHead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void approveRequest_alreadyDecided_throwsBusinessException() {
        UserPrincipal marketingHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_MARKETING);
        FolderAccessRequestEntity request = new FolderAccessRequestEntity(COMPANY_A, 1L, 2L, DEPT_ENGINEERING, null);
        request.reject(99L); // already decided
        setId(request, 5L);
        when(requestRepository.findActiveById(5L)).thenReturn(Optional.of(request));
        when(catalogRepository.findActiveById(1L)).thenReturn(Optional.of(marketingFolder()));

        assertThatThrownBy(() -> service.approveRequest(5L, marketingHead))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("REJECTED");
    }

    @Test
    void rejectRequest_correctDepartmentHead_succeeds() {
        UserPrincipal marketingHead = principal(AuthorityLevel.DEPARTMENT_HEAD, DEPT_MARKETING);
        FolderAccessRequestEntity request = new FolderAccessRequestEntity(COMPANY_A, 1L, 2L, DEPT_ENGINEERING, null);
        setId(request, 5L);
        when(requestRepository.findActiveById(5L)).thenReturn(Optional.of(request));
        when(catalogRepository.findActiveById(1L)).thenReturn(Optional.of(marketingFolder()));

        var response = service.rejectRequest(5L, marketingHead);

        assertThat(response.status()).isEqualTo(FolderRequestStatus.REJECTED);
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
