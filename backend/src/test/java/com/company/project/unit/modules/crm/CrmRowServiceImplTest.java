package com.company.project.unit.modules.crm;

import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.crm.domain.CrmAuditAction;
import com.company.project.modules.crm.domain.CrmColumnEntity;
import com.company.project.modules.crm.domain.CrmColumnType;
import com.company.project.modules.crm.domain.CrmDatasetEntity;
import com.company.project.modules.crm.domain.CrmRowEntity;
import com.company.project.modules.crm.dto.request.SaveRowRequest;
import com.company.project.modules.crm.dto.response.RowPageResponse;
import com.company.project.modules.crm.dto.response.RowResponse;
import com.company.project.modules.crm.repository.CrmColumnRepository;
import com.company.project.modules.crm.repository.CrmDatasetRepository;
import com.company.project.modules.crm.repository.CrmRowRepository;
import com.company.project.modules.crm.service.CrmAccessPolicy;
import com.company.project.modules.crm.service.CrmAuditService;
import com.company.project.modules.crm.service.impl.CrmRowServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.company.project.unit.modules.crm.CrmTestSupport.CODEC;
import static com.company.project.unit.modules.crm.CrmTestSupport.COMPANY;
import static com.company.project.unit.modules.crm.CrmTestSupport.ENGINEERING;
import static com.company.project.unit.modules.crm.CrmTestSupport.OTHER_COMPANY;
import static com.company.project.unit.modules.crm.CrmTestSupport.PROPERTIES;
import static com.company.project.unit.modules.crm.CrmTestSupport.SALES;
import static com.company.project.unit.modules.crm.CrmTestSupport.column;
import static com.company.project.unit.modules.crm.CrmTestSupport.dataset;
import static com.company.project.unit.modules.crm.CrmTestSupport.employee;
import static com.company.project.unit.modules.crm.CrmTestSupport.executive;
import static com.company.project.unit.modules.crm.CrmTestSupport.head;
import static com.company.project.unit.modules.crm.CrmTestSupport.setId;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CrmRowServiceImplTest {

    private static final Long DATASET = 5L;
    private static final Long NAME = 101L;
    private static final Long EMAIL = 102L;
    private static final Long PHONE = 103L;

    @Mock
    private CrmRowRepository rowRepository;
    @Mock
    private CrmColumnRepository columnRepository;
    @Mock
    private CrmDatasetRepository datasetRepository;
    @Mock
    private CrmAuditService auditService;

    private CrmRowServiceImpl service;
    private CrmDatasetEntity salesDataset;

    @BeforeEach
    void setUp() {
        ResourceBundleMessageSource messages = new ResourceBundleMessageSource();
        messages.setBasename("messages");
        messages.setDefaultEncoding("UTF-8");
        messages.setFallbackToSystemLocale(false);
        service = new CrmRowServiceImpl(rowRepository, columnRepository, new CrmAccessPolicy(datasetRepository), auditService, CODEC, PROPERTIES, messages);

        salesDataset = dataset(DATASET, COMPANY, SALES, 1L);
        lenient().when(datasetRepository.findActiveById(DATASET)).thenReturn(Optional.of(salesDataset));
        lenient().when(columnRepository.findAllActiveByDatasetId(DATASET)).thenReturn(columns());
        lenient().when(rowRepository.save(any(CrmRowEntity.class))).thenAnswer(invocation -> {
            CrmRowEntity row = invocation.getArgument(0);
            setId(row, 77L);
            return row;
        });
    }

    private static List<CrmColumnEntity> columns() {
        return List.of(
                column(NAME, DATASET, "Name", CrmColumnType.TEXT, 1),
                column(EMAIL, DATASET, "Email", CrmColumnType.EMAIL, 2),
                column(PHONE, DATASET, "Phone", CrmColumnType.PHONE, 3));
    }

    private CrmRowEntity storedRow(Long id, Long createdBy, Map<Long, String> values) {
        CrmRowEntity row = new CrmRowEntity(
                DATASET, COMPANY, CODEC.encode(COMPANY, values),
                CODEC.emailHash(COMPANY, columns(), values), CODEC.phoneHash(COMPANY, columns(), values), createdBy);
        setId(row, id);
        return row;
    }

    @Test
    void add_storesTheCustomerEncryptedAndKeepsOnlyKeyedHashesOfEmailAndPhone() {
        RowResponse added = service.add(DATASET, new SaveRowRequest(Map.of(NAME, " An ", EMAIL, "An@Example.com", PHONE, "+84 912 345 678")), employee(7L, SALES));

        assertThat(added.values()).containsEntry(NAME, "An").containsEntry(EMAIL, "an@example.com");
        var saved = org.mockito.ArgumentCaptor.forClass(CrmRowEntity.class);
        verify(rowRepository).save(saved.capture());
        CrmRowEntity row = saved.getValue();
        assertThat(row.getData()).doesNotContain("example").doesNotContain("An");
        assertThat(row.getEmailHash()).hasSize(64).doesNotContain("example");
        assertThat(row.getPhoneHash()).hasSize(64);
        assertThat(CODEC.decode(COMPANY, row.getData())).containsEntry(EMAIL, "an@example.com");
        assertThat(row.getCreatedByUserId()).isEqualTo(7L);
    }

    @Test
    void add_aCellThatDoesNotFitItsColumnIsRefusedWithoutEchoingTheValue() {
        assertThatThrownBy(() -> service.add(DATASET, new SaveRowRequest(Map.of(EMAIL, "secret-not-an-email")), employee(7L, SALES)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Email")
                .hasMessageNotContaining("secret-not-an-email");
        verify(rowRepository, never()).save(any());
    }

    @Test
    void add_aColumnOfAnotherDatasetIsRefused() {
        assertThatThrownBy(() -> service.add(DATASET, new SaveRowRequest(Map.of(999L, "x")), employee(7L, SALES)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("999");
    }

    @Test
    void add_aCustomerWhoseEmailOrPhoneIsAlreadyThereIsAConflict() {
        when(rowRepository.existsByDatasetIdAndEmailHashAndIdNot(eq(DATASET), anyString(), anyLong())).thenReturn(true);

        assertThatThrownBy(() -> service.add(DATASET, new SaveRowRequest(Map.of(EMAIL, "an@example.com")), employee(7L, SALES)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("email");
        verify(rowRepository, never()).save(any());
    }

    @Test
    void add_aFullDatasetTakesNoMoreCustomers() {
        when(rowRepository.countByDatasetId(DATASET)).thenReturn((long) PROPERTIES.maxRowsPerDataset());

        assertThatThrownBy(() -> service.add(DATASET, new SaveRowRequest(Map.of(NAME, "An")), employee(7L, SALES)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void anotherDepartmentAndAnotherCompanyCannotEvenSeeTheDataset() {
        assertThatThrownBy(() -> service.add(DATASET, new SaveRowRequest(Map.of(NAME, "An")), employee(7L, ENGINEERING)))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.list(DATASET, 0, 50, null, executive(9L, OTHER_COMPANY)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_changesOnlyTheGivenColumnsAndAnEmptyValueClearsACell() {
        CrmRowEntity row = storedRow(77L, 7L, Map.of(NAME, "An", EMAIL, "an@example.com", PHONE, "0912345678"));
        when(rowRepository.findByIdAndCompanyId(77L, COMPANY)).thenReturn(Optional.of(row));

        RowResponse updated = service.update(77L, new SaveRowRequest(Map.of(NAME, "Anh", PHONE, "")), employee(7L, SALES));

        assertThat(updated.values()).containsEntry(NAME, "Anh").containsEntry(EMAIL, "an@example.com").doesNotContainKey(PHONE);
        assertThat(row.getPhoneHash()).isNull();
        assertThat(CODEC.decode(COMPANY, row.getData())).containsEntry(NAME, "Anh").doesNotContainKey(PHONE);
    }

    @Test
    void update_toAnEmailAnotherCustomerHasIsAConflict() {
        CrmRowEntity row = storedRow(77L, 7L, Map.of(NAME, "An", EMAIL, "an@example.com"));
        when(rowRepository.findByIdAndCompanyId(77L, COMPANY)).thenReturn(Optional.of(row));
        when(rowRepository.existsByDatasetIdAndEmailHashAndIdNot(eq(DATASET), anyString(), eq(77L))).thenReturn(true);

        assertThatThrownBy(() -> service.update(77L, new SaveRowRequest(Map.of(EMAIL, "taken@example.com")), employee(7L, SALES)))
                .isInstanceOf(BusinessException.class);
        assertThat(CODEC.decode(COMPANY, row.getData())).containsEntry(EMAIL, "an@example.com");
    }

    @Test
    void list_readsAPageAndHidesValuesOfColumnsThatNoLongerExist() {
        CrmRowEntity row = storedRow(77L, 7L, Map.of(NAME, "An", 999L, "from a deleted column"));
        when(rowRepository.findPageByDatasetId(eq(DATASET), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(row)));

        RowPageResponse page = service.list(DATASET, 0, 50, null, employee(7L, SALES));

        assertThat(page.total()).isEqualTo(1);
        assertThat(page.rows().get(0).values()).containsOnlyKeys(NAME);
    }

    @Test
    void list_searchFindsCustomersIgnoringCaseAndAccentsAndPagesTheResult() {
        when(rowRepository.findAllByDatasetId(DATASET)).thenReturn(List.of(
                storedRow(1L, 7L, Map.of(NAME, "Nguyễn Văn An")),
                storedRow(2L, 7L, Map.of(NAME, "Trần Thị Bình")),
                storedRow(3L, 7L, Map.of(NAME, "Lê NGUYEN Cường"))));

        RowPageResponse all = service.list(DATASET, 0, 50, "nguyen", employee(7L, SALES));
        RowPageResponse secondPage = service.list(DATASET, 1, 1, "nguyen", employee(7L, SALES));

        assertThat(all.rows()).extracting(RowResponse::id).containsExactly(1L, 3L);
        assertThat(all.total()).isEqualTo(2);
        assertThat(secondPage.rows()).extracting(RowResponse::id).containsExactly(3L);
    }

    @Test
    void delete_whoeverAddedTheCustomerOrAManagerMayDeleteButAnotherEmployeeMayNot() {
        CrmRowEntity row = storedRow(77L, 7L, Map.of(NAME, "An"));
        when(rowRepository.findByIdAndCompanyId(77L, COMPANY)).thenReturn(Optional.of(row));

        assertThatThrownBy(() -> service.delete(77L, employee(8L, SALES))).isInstanceOf(AccessDeniedException.class);
        verify(rowRepository, never()).delete(any());

        service.delete(77L, employee(7L, SALES));
        service.delete(77L, head(9L, SALES));
        verify(rowRepository, org.mockito.Mockito.times(2)).delete(row);
        verify(auditService, org.mockito.Mockito.times(2)).record(any(), eq(CrmAuditAction.ROW_DELETED), eq(DATASET), eq("rows=1"));
    }

    @Test
    void aRowOfAnotherCompanyIsNotFound() {
        when(rowRepository.findByIdAndCompanyId(77L, OTHER_COMPANY)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(77L, new SaveRowRequest(Map.of(NAME, "x")), executive(9L, OTHER_COMPANY)))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
