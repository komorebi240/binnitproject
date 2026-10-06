package com.company.project.unit.modules.identity;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.CompanyEntity;
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
import com.company.project.common.exception.BusinessException;
import com.company.project.modules.identity.dto.request.UpdateCompanyRequest;
import com.company.project.modules.identity.dto.request.UpdateDepartmentRequest;
import org.springframework.security.access.AccessDeniedException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
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


    // ---- company profile (description, banner) ----

    private CompanyEntity companyOf(UserPrincipal caller) {
        CompanyEntity company = new CompanyEntity("Acme");
        setId(company, caller.getCompanyId());
        when(companyRepository.findActiveById(caller.getCompanyId())).thenReturn(Optional.of(company));
        return company;
    }

    @Test
    void updateCompany_savesATrimmedDescriptionAndClearsABlankOne() {
        UserPrincipal executive = new UserPrincipal(1L, "boss", null, COMPANY_A, AuthorityLevel.EXECUTIVE, null, null, true);
        CompanyEntity company = companyOf(executive);

        var saved = service.updateCompany(new UpdateCompanyRequest("Acme", null, "  We build things  "), executive);
        assertThat(saved.description()).isEqualTo("We build things");

        var cleared = service.updateCompany(new UpdateCompanyRequest("Acme", null, "   "), executive);
        assertThat(cleared.description()).isNull();
        assertThat(company.getDescription()).isNull();
    }

    @Test
    void uploadCompanyBanner_onlyAnExecutiveMayChangeIt() {
        UserPrincipal employee = new UserPrincipal(2L, "emp", null, COMPANY_A, AuthorityLevel.EMPLOYEE, null, null, true);

        assertThatThrownBy(() -> service.uploadCompanyBanner(null, employee))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(avatarStorageService);
    }

    @Test
    void getCompanyBannerFile_withoutABannerIsNotFound() {
        UserPrincipal member = new UserPrincipal(2L, "emp", null, COMPANY_A, AuthorityLevel.EMPLOYEE, null, null, true);
        companyOf(member);

        assertThatThrownBy(() -> service.getCompanyBannerFile(member))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- department edit (name, description, colour, icon) ----

    private DepartmentEntity department(Long id, String name) {
        DepartmentEntity department = new DepartmentEntity(COMPANY_A, name);
        setId(department, id);
        when(departmentRepository.findActiveById(id)).thenReturn(Optional.of(department));
        return department;
    }

    @Test
    void updateDepartment_executiveChangesNameDescriptionColourAndIcon() {
        UserPrincipal executive = new UserPrincipal(1L, "ceo", null, COMPANY_A, AuthorityLevel.EXECUTIVE, null, null, true);
        DepartmentEntity department = department(10L, "Old name");
        when(departmentRepository.findAllActiveByCompanyId(COMPANY_A)).thenReturn(List.of(department));

        var response = service.updateDepartment(
                10L, new UpdateDepartmentRequest(" Engineering ", "Builds things", "Emerald", "code"), executive);

        assertThat(response.name()).isEqualTo("Engineering");
        assertThat(response.color()).isEqualTo("emerald");
        assertThat(response.icon()).isEqualTo("code");
    }

    @Test
    void updateDepartment_headOfAnotherDepartmentIsDenied() {
        UserPrincipal otherHead = new UserPrincipal(
                1L, "head", null, COMPANY_A, AuthorityLevel.DEPARTMENT_HEAD, 20L, null, true);
        department(10L, "Engineering");

        assertThatThrownBy(() -> service.updateDepartment(
                10L, new UpdateDepartmentRequest("Engineering", null, null, null), otherHead))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void updateDepartment_headOfThatDepartmentMayEditIt() {
        UserPrincipal head = new UserPrincipal(1L, "head", null, COMPANY_A, AuthorityLevel.DEPARTMENT_HEAD, 10L, null, true);
        DepartmentEntity department = department(10L, "Engineering");
        when(departmentRepository.findAllActiveByCompanyId(COMPANY_A)).thenReturn(List.of(department));

        var response = service.updateDepartment(10L, new UpdateDepartmentRequest("Engineering", "  ", null, null), head);

        assertThat(response.description()).isNull();
    }

    @Test
    void updateDepartment_nameUsedByAnotherDepartmentIsAConflict() {
        UserPrincipal executive = new UserPrincipal(1L, "ceo", null, COMPANY_A, AuthorityLevel.EXECUTIVE, null, null, true);
        DepartmentEntity department = department(10L, "Engineering");
        DepartmentEntity other = new DepartmentEntity(COMPANY_A, "Sales");
        setId(other, 20L);
        when(departmentRepository.findAllActiveByCompanyId(COMPANY_A)).thenReturn(List.of(department, other));

        assertThatThrownBy(() -> service.updateDepartment(
                10L, new UpdateDepartmentRequest("sales", null, null, null), executive))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already uses");
    }

    @Test
    void updateDepartment_unknownColourOrIconIsRejected() {
        UserPrincipal executive = new UserPrincipal(1L, "ceo", null, COMPANY_A, AuthorityLevel.EXECUTIVE, null, null, true);
        DepartmentEntity department = department(10L, "Engineering");
        when(departmentRepository.findAllActiveByCompanyId(COMPANY_A)).thenReturn(List.of(department));

        assertThatThrownBy(() -> service.updateDepartment(
                10L, new UpdateDepartmentRequest("Engineering", null, "<script>", null), executive))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.updateDepartment(
                10L, new UpdateDepartmentRequest("Engineering", null, null, "not-an-icon"), executive))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void updateDepartment_otherCompanyIsNotFound() {
        UserPrincipal executive = new UserPrincipal(1L, "ceo", null, COMPANY_A, AuthorityLevel.EXECUTIVE, null, null, true);
        DepartmentEntity foreign = new DepartmentEntity(999L, "Foreign");
        setId(foreign, 10L);
        when(departmentRepository.findActiveById(10L)).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> service.updateDepartment(
                10L, new UpdateDepartmentRequest("Foreign", null, null, null), executive))
                .isInstanceOf(ResourceNotFoundException.class);
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
