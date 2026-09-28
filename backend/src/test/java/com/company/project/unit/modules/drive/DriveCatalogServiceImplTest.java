package com.company.project.unit.modules.drive;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.exception.BusinessException;
import com.company.project.modules.drive.dto.request.RegisterFolderRequest;
import com.company.project.modules.drive.repository.DepartmentDriveFolderRepository;
import com.company.project.modules.drive.service.DriveConnectionService;
import com.company.project.modules.drive.service.GoogleDriveClient;
import com.company.project.modules.drive.service.impl.DriveCatalogServiceImpl;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Covers the department-scoping rules from the Phase 3 plan — the same case (TC-23) was also
 * caught for real via curl during manual testing (registerFolder originally silently ignored a
 * mismatched departmentId instead of rejecting it; fixed to throw). This locks that fix in.
 */
@ExtendWith(MockitoExtension.class)
class DriveCatalogServiceImplTest {

    private static final Long COMPANY_A = 1L;
    private static final Long DEPT_ENGINEERING = 10L;
    private static final Long DEPT_SALES = 20L;

    @Mock
    private DepartmentDriveFolderRepository catalogRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private DriveConnectionService driveConnectionService;
    @Mock
    private GoogleDriveClient googleDriveClient;

    private DriveCatalogServiceImpl newService() {
        return new DriveCatalogServiceImpl(catalogRepository, departmentRepository, driveConnectionService, googleDriveClient);
    }

    private UserPrincipal principal(AuthorityLevel level, Long departmentId) {
        return new UserPrincipal(1L, "caller", null, COMPANY_A, level, departmentId, null, true);
    }

    @Test
    void registerFolder_nonExecutiveExplicitlyTargetingDifferentDepartment_throwsAccessDenied() {
        UserPrincipal employee = principal(AuthorityLevel.EMPLOYEE, DEPT_ENGINEERING);
        RegisterFolderRequest request = new RegisterFolderRequest("some-folder-id", DEPT_SALES);

        assertThatThrownBy(() -> newService().registerFolder(request, employee))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void registerFolder_executiveWithoutDepartmentId_throwsBusinessException() {
        UserPrincipal executive = principal(AuthorityLevel.EXECUTIVE, null);
        RegisterFolderRequest request = new RegisterFolderRequest("some-folder-id", null);

        assertThatThrownBy(() -> newService().registerFolder(request, executive))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("departmentId");
    }
}
