package com.company.project.unit.modules.crm;

import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.crm.domain.CrmDatasetEntity;
import com.company.project.modules.crm.repository.CrmDatasetRepository;
import com.company.project.modules.crm.service.CrmAccessPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static com.company.project.unit.modules.crm.CrmTestSupport.COMPANY;
import static com.company.project.unit.modules.crm.CrmTestSupport.ENGINEERING;
import static com.company.project.unit.modules.crm.CrmTestSupport.OTHER_COMPANY;
import static com.company.project.unit.modules.crm.CrmTestSupport.SALES;
import static com.company.project.unit.modules.crm.CrmTestSupport.dataset;
import static com.company.project.unit.modules.crm.CrmTestSupport.employee;
import static com.company.project.unit.modules.crm.CrmTestSupport.executive;
import static com.company.project.unit.modules.crm.CrmTestSupport.head;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/** Executives use everything of their company; a department uses only its own datasets; another company sees nothing. */
@ExtendWith(MockitoExtension.class)
class CrmAccessPolicyTest {

    @Mock
    private CrmDatasetRepository datasetRepository;

    private CrmAccessPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new CrmAccessPolicy(datasetRepository);
    }

    @Test
    void anExecutiveUsesAndManagesEveryDatasetOfTheirCompany() {
        CrmDatasetEntity executivesOnly = dataset(1L, COMPANY, null, 5L);
        CrmDatasetEntity ofSales = dataset(2L, COMPANY, SALES, 5L);

        assertThat(policy.canUse(executivesOnly, executive(9L, COMPANY))).isTrue();
        assertThat(policy.canManage(executivesOnly, executive(9L, COMPANY))).isTrue();
        assertThat(policy.canUse(ofSales, executive(9L, COMPANY))).isTrue();
        assertThat(policy.canManage(ofSales, executive(9L, COMPANY))).isTrue();
    }

    @Test
    void aDepartmentUsesItsOwnDatasetsAndOnlyItsHeadManagesThem() {
        CrmDatasetEntity ofSales = dataset(2L, COMPANY, SALES, 5L);

        assertThat(policy.canUse(ofSales, employee(7L, SALES))).isTrue();
        assertThat(policy.canManage(ofSales, employee(7L, SALES))).isFalse();
        assertThat(policy.canManage(ofSales, head(8L, SALES))).isTrue();
    }

    @Test
    void anotherDepartmentAndAnExecutivesOnlyDatasetAreOutOfReach() {
        CrmDatasetEntity ofSales = dataset(2L, COMPANY, SALES, 5L);
        CrmDatasetEntity executivesOnly = dataset(1L, COMPANY, null, 5L);

        assertThat(policy.canUse(ofSales, employee(7L, ENGINEERING))).isFalse();
        assertThat(policy.canManage(ofSales, head(8L, ENGINEERING))).isFalse();
        assertThat(policy.canUse(executivesOnly, head(8L, SALES))).isFalse();
    }

    @Test
    void anotherCompanyCanNeverUseOrManageEvenAsExecutive() {
        CrmDatasetEntity ofSales = dataset(2L, COMPANY, SALES, 5L);

        assertThat(policy.canUse(ofSales, executive(9L, OTHER_COMPANY))).isFalse();
        assertThat(policy.canManage(ofSales, executive(9L, OTHER_COMPANY))).isFalse();
    }

    @Test
    void creatingIsForExecutivesAnywhereAndForAHeadInTheirOwnDepartment() {
        assertThat(policy.canCreateFor(null, executive(9L, COMPANY))).isTrue();
        assertThat(policy.canCreateFor(SALES, executive(9L, COMPANY))).isTrue();
        assertThat(policy.canCreateFor(SALES, head(8L, SALES))).isTrue();
        assertThat(policy.canCreateFor(ENGINEERING, head(8L, SALES))).isFalse();
        assertThat(policy.canCreateFor(null, head(8L, SALES))).isFalse();
        assertThat(policy.canCreateFor(SALES, employee(7L, SALES))).isFalse();
    }

    @Test
    void aDatasetOutOfReachReadsAsNotFound() {
        when(datasetRepository.findActiveById(2L)).thenReturn(Optional.of(dataset(2L, COMPANY, SALES, 5L)));

        assertThatThrownBy(() -> policy.requireUsable(2L, employee(7L, ENGINEERING))).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> policy.requireUsable(2L, executive(9L, OTHER_COMPANY))).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void aDatasetThatIsUsableButNotManageableIsForbiddenNotHidden() {
        when(datasetRepository.findActiveById(2L)).thenReturn(Optional.of(dataset(2L, COMPANY, SALES, 5L)));

        assertThatThrownBy(() -> policy.requireManageable(2L, employee(7L, SALES))).isInstanceOf(AccessDeniedException.class);
        assertThat(policy.requireManageable(2L, head(8L, SALES)).getId()).isEqualTo(2L);
    }
}
