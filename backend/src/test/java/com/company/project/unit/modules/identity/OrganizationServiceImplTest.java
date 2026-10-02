package com.company.project.unit.modules.identity;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.dto.response.DepartmentMemberResponse;
import com.company.project.modules.identity.domain.TeamEntity;
import com.company.project.modules.identity.repository.CompanyRepository;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.TeamRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.AvatarStorageService;
import com.company.project.modules.identity.service.impl.OrganizationServiceImpl;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/** Covers Phase 7's new company-directory read (TC-72): still tenant-isolated like everything else. */
@ExtendWith(MockitoExtension.class)
class OrganizationServiceImplTest {

    private static final Long COMPANY_A = 1L;

    @Mock
    private CompanyRepository companyRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private PositionRepository positionRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AvatarStorageService avatarStorageService;

    private OrganizationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new OrganizationServiceImpl(
                companyRepository, departmentRepository, teamRepository, positionRepository, userRepository, avatarStorageService);
    }

    @Test
    void listDepartmentMembers_crossCompanyDepartmentIsNotFound() {
        UserPrincipal caller = new UserPrincipal(1L, "caller", null, COMPANY_A, AuthorityLevel.EMPLOYEE, null, null, true);
        DepartmentEntity otherCompanyDept = new DepartmentEntity(999L, "Other Co Dept");
        setId(otherCompanyDept, 10L);
        when(departmentRepository.findActiveById(10L)).thenReturn(Optional.of(otherCompanyDept));

        assertThatThrownBy(() -> service.listDepartmentMembers(10L, caller))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void listTeamMembers_crossCompanyTeamIsNotFound() {
        UserPrincipal caller = new UserPrincipal(1L, "caller", null, COMPANY_A, AuthorityLevel.EMPLOYEE, null, null, true);
        DepartmentEntity otherCompanyDept = new DepartmentEntity(999L, "Other Co Dept");
        setId(otherCompanyDept, 10L);
        TeamEntity otherCompanyTeam = new TeamEntity(10L, "Other Co Team");
        setId(otherCompanyTeam, 20L);
        when(teamRepository.findActiveById(20L)).thenReturn(Optional.of(otherCompanyTeam));
        when(departmentRepository.findActiveById(10L)).thenReturn(Optional.of(otherCompanyDept));

        assertThatThrownBy(() -> service.listTeamMembers(20L, caller))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void listDepartmentMembers_hidesSystemAccountButKeepsRealUsers() {
        UserPrincipal caller = new UserPrincipal(1L, "caller", null, COMPANY_A, AuthorityLevel.EMPLOYEE, null, null, true);
        DepartmentEntity dept = new DepartmentEntity(COMPANY_A, "Dept");
        setId(dept, 10L);
        UserEntity human = new UserEntity(COMPANY_A, "human", "hash", "Human", "h@x.com");
        setId(human, 100L);
        UserEntity bot = new UserEntity(COMPANY_A, "bot", "hash", "Bot", "b@x.com");
        setId(bot, 101L);
        bot.markAsSystemAccount();
        PositionEntity humanPosition = new PositionEntity(100L, AuthorityLevel.EMPLOYEE, 10L, null, null);
        PositionEntity botPosition = new PositionEntity(101L, AuthorityLevel.EMPLOYEE, 10L, null, null);
        when(departmentRepository.findActiveById(10L)).thenReturn(Optional.of(dept));
        when(positionRepository.findAllActiveByDepartmentId(10L)).thenReturn(List.of(humanPosition, botPosition));
        when(userRepository.findAllActiveByIds(List.of(100L, 101L))).thenReturn(List.of(human, bot));

        assertThat(service.listDepartmentMembers(10L, caller))
                .extracting(DepartmentMemberResponse::userId)
                .containsExactly(100L);
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
