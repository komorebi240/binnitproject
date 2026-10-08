package com.company.project.unit.modules.crm;

import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.crm.domain.CrmAuditAction;
import com.company.project.modules.crm.domain.CrmColumnEntity;
import com.company.project.modules.crm.domain.CrmColumnType;
import com.company.project.modules.crm.domain.CrmDatasetEntity;
import com.company.project.modules.crm.domain.CrmRowEntity;
import com.company.project.modules.crm.domain.CrmSourceType;
import com.company.project.modules.crm.dto.request.CreateColumnRequest;
import com.company.project.modules.crm.dto.request.CreateDatasetRequest;
import com.company.project.modules.crm.dto.request.RenameColumnRequest;
import com.company.project.modules.crm.dto.response.DatasetDetailResponse;
import com.company.project.modules.crm.dto.response.DatasetResponse;
import com.company.project.modules.crm.repository.CrmColumnRepository;
import com.company.project.modules.crm.repository.CrmDatasetRepository;
import com.company.project.modules.crm.repository.CrmRowRepository;
import com.company.project.modules.crm.service.CrmAccessPolicy;
import com.company.project.modules.crm.service.CrmAuditService;
import com.company.project.modules.crm.service.impl.CrmDatasetServiceImpl;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.repository.DepartmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.security.access.AccessDeniedException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CrmDatasetServiceImplTest {

    private static final Long DATASET = 5L;

    @Mock
    private CrmDatasetRepository datasetRepository;
    @Mock
    private CrmColumnRepository columnRepository;
    @Mock
    private CrmRowRepository rowRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private CrmAuditService auditService;

    private CrmDatasetServiceImpl service;
    private long nextId = 300;

    @BeforeEach
    void setUp() {
        ResourceBundleMessageSource messages = new ResourceBundleMessageSource();
        messages.setBasename("messages");
        messages.setDefaultEncoding("UTF-8");
        messages.setFallbackToSystemLocale(false);
        LocaleContextHolder.setLocale(Locale.ENGLISH);
        service = new CrmDatasetServiceImpl(
                datasetRepository, columnRepository, rowRepository, departmentRepository,
                new CrmAccessPolicy(datasetRepository), auditService, CODEC, PROPERTIES, messages);
        lenient().when(datasetRepository.save(any(CrmDatasetEntity.class))).thenAnswer(invocation -> {
            CrmDatasetEntity saved = invocation.getArgument(0);
            setId(saved, DATASET);
            return saved;
        });
        lenient().when(columnRepository.save(any(CrmColumnEntity.class))).thenAnswer(invocation -> {
            CrmColumnEntity saved = invocation.getArgument(0);
            setId(saved, nextId++);
            return saved;
        });
        lenient().when(departmentRepository.findAllActiveByCompanyId(COMPANY)).thenReturn(List.of());
    }

    private void salesDepartmentExists() {
        DepartmentEntity department = org.mockito.Mockito.mock(DepartmentEntity.class);
        when(department.getCompanyId()).thenReturn(COMPANY);
        when(departmentRepository.findActiveById(SALES)).thenReturn(Optional.of(department));
    }

    @Test
    void create_makesTheDatasetWithTheUsualFirstColumnsInTheLanguageOfTheRequest() {
        salesDepartmentExists();

        DatasetDetailResponse created = service.create(
                new CreateDatasetRequest("  Facebook leads ", CrmSourceType.FACEBOOK, " ", SALES), head(8L, SALES));

        assertThat(created.dataset().name()).isEqualTo("Facebook leads");
        assertThat(created.dataset().description()).isNull();
        assertThat(created.columns()).extracting(c -> c.name()).containsExactly("Full name", "Email", "Phone");
        assertThat(created.columns()).extracting(c -> c.dataType()).containsExactly(CrmColumnType.TEXT, CrmColumnType.EMAIL, CrmColumnType.PHONE);
        verify(auditService).record(any(), eq(CrmAuditAction.DATASET_CREATED), eq(DATASET), eq("source=FACEBOOK"));
    }

    @Test
    void create_aHeadOnlyForTheirOwnDepartmentAndNobodyBelowAHead() {
        assertThatThrownBy(() -> service.create(new CreateDatasetRequest("X", CrmSourceType.OTHER, null, ENGINEERING), head(8L, SALES)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.create(new CreateDatasetRequest("X", CrmSourceType.OTHER, null, null), head(8L, SALES)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.create(new CreateDatasetRequest("X", CrmSourceType.OTHER, null, SALES), employee(7L, SALES)))
                .isInstanceOf(AccessDeniedException.class);
        verify(datasetRepository, never()).save(any());
    }

    @Test
    void create_theDepartmentMustBelongToTheCompany() {
        when(departmentRepository.findActiveById(SALES)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(new CreateDatasetRequest("X", CrmSourceType.OTHER, null, SALES), executive(9L, COMPANY)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void list_showsOnlyTheDatasetsTheCallerMayUseWithTheirRowCounts() {
        CrmDatasetEntity ofSales = dataset(DATASET, COMPANY, SALES, 1L);
        CrmDatasetEntity ofEngineering = dataset(6L, COMPANY, ENGINEERING, 1L);
        CrmDatasetEntity executivesOnly = dataset(7L, COMPANY, null, 1L);
        when(datasetRepository.findAllActiveByCompanyId(COMPANY)).thenReturn(List.of(ofSales, ofEngineering, executivesOnly));
        when(rowRepository.countByCompanyIdGroupedByDataset(COMPANY)).thenReturn(List.of(new CrmRowRepository.RowCount() {
            public Long getDatasetId() { return DATASET; }
            public long getTotal() { return 42; }
        }));

        List<DatasetResponse> forSales = service.list(employee(7L, SALES));
        List<DatasetResponse> forExecutive = service.list(executive(9L, COMPANY));

        assertThat(forSales).extracting(DatasetResponse::id).containsExactly(DATASET);
        assertThat(forSales.get(0).rowCount()).isEqualTo(42);
        assertThat(forSales.get(0).canManage()).isFalse();
        assertThat(forExecutive).extracting(DatasetResponse::id).containsExactly(DATASET, 6L, 7L);
        assertThat(forExecutive.get(2).rowCount()).isZero();
        assertThat(forExecutive.get(0).canManage()).isTrue();
    }

    @Test
    void delete_reallyDeletesTheCustomersAndRecordsOnlyTheCount() {
        CrmDatasetEntity ofSales = dataset(DATASET, COMPANY, SALES, 1L);
        when(datasetRepository.findActiveById(DATASET)).thenReturn(Optional.of(ofSales));
        when(rowRepository.deleteAllByDatasetId(DATASET)).thenReturn(12);
        CrmColumnEntity nameColumn = column(101L, DATASET, "Name", CrmColumnType.TEXT, 1);
        when(columnRepository.findAllActiveByDatasetId(DATASET)).thenReturn(List.of(nameColumn));

        service.delete(DATASET, head(8L, SALES));

        assertThat(ofSales.isDeleted()).isTrue();
        verify(rowRepository).deleteAllByDatasetId(DATASET);
        verify(auditService).record(any(), eq(CrmAuditAction.DATASET_DELETED), eq(DATASET), eq("rows=12"));
    }

    @Test
    void delete_anEmployeeCannotAndAnotherCompanyDoesNotEvenSeeIt() {
        when(datasetRepository.findActiveById(DATASET)).thenReturn(Optional.of(dataset(DATASET, COMPANY, SALES, 1L)));

        assertThatThrownBy(() -> service.delete(DATASET, employee(7L, SALES))).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.delete(DATASET, executive(9L, OTHER_COMPANY))).isInstanceOf(ResourceNotFoundException.class);
        verify(rowRepository, never()).deleteAllByDatasetId(any());
    }

    @Test
    void addColumn_numbersItAfterTheOthersAndRefusesADuplicateNameOrTooManyColumns() {
        when(datasetRepository.findActiveById(DATASET)).thenReturn(Optional.of(dataset(DATASET, COMPANY, SALES, 1L)));
        when(columnRepository.findAllActiveByDatasetId(DATASET)).thenReturn(List.of(column(101L, DATASET, "Name", CrmColumnType.TEXT, 1)));
        when(columnRepository.maxPosition(DATASET)).thenReturn(1);

        assertThat(service.addColumn(DATASET, new CreateColumnRequest(" Budget ", CrmColumnType.NUMBER), head(8L, SALES)).position()).isEqualTo(2);
        assertThatThrownBy(() -> service.addColumn(DATASET, new CreateColumnRequest("NAME", CrmColumnType.TEXT), head(8L, SALES)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("already has a column");

        List<CrmColumnEntity> full = new ArrayList<>();
        for (int i = 0; i < PROPERTIES.maxColumns(); i++) {
            full.add(column(200L + i, DATASET, "C" + i, CrmColumnType.TEXT, i + 1));
        }
        when(columnRepository.findAllActiveByDatasetId(DATASET)).thenReturn(full);
        assertThatThrownBy(() -> service.addColumn(DATASET, new CreateColumnRequest("One more", CrmColumnType.TEXT), head(8L, SALES)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("at most");
    }

    @Test
    void renameColumn_keepsNamesUniqueWithinTheDataset() {
        CrmColumnEntity name = column(101L, DATASET, "Name", CrmColumnType.TEXT, 1);
        CrmColumnEntity email = column(102L, DATASET, "Email", CrmColumnType.EMAIL, 2);
        when(columnRepository.findActiveById(102L)).thenReturn(Optional.of(email));
        when(datasetRepository.findActiveById(DATASET)).thenReturn(Optional.of(dataset(DATASET, COMPANY, SALES, 1L)));
        when(columnRepository.findAllActiveByDatasetId(DATASET)).thenReturn(List.of(name, email));

        assertThatThrownBy(() -> service.renameColumn(102L, new RenameColumnRequest("name"), head(8L, SALES))).isInstanceOf(BusinessException.class);

        assertThat(service.renameColumn(102L, new RenameColumnRequest("Contact email"), head(8L, SALES)).name()).isEqualTo("Contact email");
        assertThat(service.renameColumn(102L, new RenameColumnRequest("EMAIL"), head(8L, SALES)).name()).isEqualTo("EMAIL");
    }

    @Test
    void deleteColumn_removesItsValuesFromEveryCustomerAndMovesTheDuplicateKeyToTheNextEmailColumn() {
        CrmColumnEntity name = column(101L, DATASET, "Name", CrmColumnType.TEXT, 1);
        CrmColumnEntity workEmail = column(102L, DATASET, "Work email", CrmColumnType.EMAIL, 2);
        CrmColumnEntity homeEmail = column(103L, DATASET, "Home email", CrmColumnType.EMAIL, 3);
        when(columnRepository.findActiveById(102L)).thenReturn(Optional.of(workEmail));
        when(datasetRepository.findActiveById(DATASET)).thenReturn(Optional.of(dataset(DATASET, COMPANY, SALES, 1L)));
        when(columnRepository.findAllActiveByDatasetId(DATASET)).thenReturn(List.of(name, homeEmail));
        Map<Long, String> values = Map.of(101L, "An", 102L, "work@example.com", 103L, "home@example.com");
        CrmRowEntity row = new CrmRowEntity(DATASET, COMPANY, CODEC.encode(COMPANY, values),
                CODEC.emailHash(COMPANY, List.of(name, workEmail, homeEmail), values), null, 1L);
        when(rowRepository.findAllByDatasetId(DATASET)).thenReturn(List.of(row));

        service.deleteColumn(102L, head(8L, SALES));

        Map<Long, String> after = CODEC.decode(COMPANY, row.getData());
        assertThat(after).containsOnlyKeys(101L, 103L);
        assertThat(row.getData()).doesNotContain("work@example.com");
        assertThat(row.getEmailHash()).isEqualTo(CODEC.emailHash(COMPANY, List.of(name, homeEmail), after));
        verify(columnRepository, times(1)).flush();
        verify(auditService).record(any(), eq(CrmAuditAction.COLUMN_DELETED), eq(DATASET), eq("type=EMAIL"));
    }
}
