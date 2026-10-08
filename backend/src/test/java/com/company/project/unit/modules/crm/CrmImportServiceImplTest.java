package com.company.project.unit.modules.crm;

import com.company.project.common.exception.BusinessException;
import com.company.project.modules.crm.domain.CrmAuditAction;
import com.company.project.modules.crm.domain.CrmColumnEntity;
import com.company.project.modules.crm.domain.CrmColumnType;
import com.company.project.modules.crm.domain.CrmRowEntity;
import com.company.project.modules.crm.dto.request.DuplicatePolicy;
import com.company.project.modules.crm.dto.request.ImportOptions;
import com.company.project.modules.crm.dto.request.ImportOptions.ColumnMapping;
import com.company.project.modules.crm.dto.response.ImportPreviewResponse;
import com.company.project.modules.crm.dto.response.ImportResultResponse;
import com.company.project.modules.crm.file.CrmFileReader;
import com.company.project.modules.crm.repository.CrmColumnRepository;
import com.company.project.modules.crm.repository.CrmDatasetRepository;
import com.company.project.modules.crm.repository.CrmRowRepository;
import com.company.project.modules.crm.service.CrmAccessPolicy;
import com.company.project.modules.crm.service.CrmAuditService;
import com.company.project.modules.crm.service.impl.CrmImportServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.company.project.unit.modules.crm.CrmTestSupport.CODEC;
import static com.company.project.unit.modules.crm.CrmTestSupport.COMPANY;
import static com.company.project.unit.modules.crm.CrmTestSupport.PROPERTIES;
import static com.company.project.unit.modules.crm.CrmTestSupport.SALES;
import static com.company.project.unit.modules.crm.CrmTestSupport.column;
import static com.company.project.unit.modules.crm.CrmTestSupport.dataset;
import static com.company.project.unit.modules.crm.CrmTestSupport.employee;
import static com.company.project.unit.modules.crm.CrmTestSupport.head;
import static com.company.project.unit.modules.crm.CrmTestSupport.setId;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CrmImportServiceImplTest {

    private static final Long DATASET = 5L;
    private static final Long NAME = 101L;
    private static final Long EMAIL = 102L;
    private static final Long PHONE = 103L;

    @Mock
    private CrmColumnRepository columnRepository;
    @Mock
    private CrmRowRepository rowRepository;
    @Mock
    private CrmDatasetRepository datasetRepository;
    @Mock
    private CrmAuditService auditService;

    private CrmImportServiceImpl service;
    private long nextColumnId = 500;

    @BeforeEach
    void setUp() {
        service = new CrmImportServiceImpl(
                new CrmFileReader(PROPERTIES), columnRepository, rowRepository, new CrmAccessPolicy(datasetRepository), auditService, CODEC, PROPERTIES);
        lenient().when(datasetRepository.findActiveById(DATASET)).thenReturn(Optional.of(dataset(DATASET, COMPANY, SALES, 1L)));
        lenient().when(columnRepository.findAllActiveByDatasetId(DATASET)).thenReturn(columns());
        lenient().when(columnRepository.save(any(CrmColumnEntity.class))).thenAnswer(invocation -> {
            CrmColumnEntity saved = invocation.getArgument(0);
            setId(saved, nextColumnId++);
            return saved;
        });
    }

    private static List<CrmColumnEntity> columns() {
        return new ArrayList<>(List.of(
                column(NAME, DATASET, "Name", CrmColumnType.TEXT, 1),
                column(EMAIL, DATASET, "Email", CrmColumnType.EMAIL, 2),
                column(PHONE, DATASET, "Phone", CrmColumnType.PHONE, 3)));
    }

    private static byte[] csv(String text) {
        return text.getBytes(StandardCharsets.UTF_8);
    }

    private static ImportOptions options(DuplicatePolicy policy, ColumnMapping... mappings) {
        return new ImportOptions(0, List.of(mappings), policy);
    }

    private static ColumnMapping toColumn(int source, Long columnId) {
        return new ColumnMapping(source, columnId, null, null);
    }

    private static ColumnMapping toNew(int source, String name, CrmColumnType type) {
        return new ColumnMapping(source, null, name, type);
    }

    private List<CrmRowEntity> createdRows() {
        ArgumentCaptor<Iterable<CrmRowEntity>> captor = ArgumentCaptor.forClass(Iterable.class);
        verify(rowRepository).saveAll(captor.capture());
        List<CrmRowEntity> rows = new ArrayList<>();
        captor.getValue().forEach(rows::add);
        return rows;
    }

    @Test
    void preview_showsTheTablesColumnsAndFirstRowsWithoutSavingAnything() {
        byte[] file = csv("Name,Email\nAn,an@example.com\nBinh,binh@example.com\nC,c@example.com\nD,d@example.com\nE,e@example.com\nF,f@example.com\n");

        ImportPreviewResponse preview = service.preview("leads.csv", file, head(8L, SALES));

        assertThat(preview.tables()).hasSize(1);
        assertThat(preview.tables().get(0).headers()).containsExactly("Name", "Email");
        assertThat(preview.tables().get(0).sampleRows()).hasSize(5);
        assertThat(preview.tables().get(0).totalRows()).isEqualTo(6);
        verify(rowRepository, never()).saveAll(any());
    }

    @Test
    void import_createsCustomersIntoMappedColumnsAndANewColumnForWhatIsLeft() {
        byte[] file = csv("Họ tên,Mail,Công ty\nAn,An@Example.com,ABC\nBình,binh@example.com,XYZ\n");

        ImportResultResponse result = service.importInto(DATASET, "leads.csv", file,
                options(DuplicatePolicy.SKIP, toColumn(0, NAME), toColumn(1, EMAIL), toNew(2, "Company", CrmColumnType.TEXT)), head(8L, SALES));

        assertThat(result.created()).isEqualTo(2);
        assertThat(result.updated()).isZero();
        assertThat(result.rejected()).isZero();
        List<CrmRowEntity> rows = createdRows();
        Map<Long, String> first = CODEC.decode(COMPANY, rows.get(0).getData());
        assertThat(first).containsEntry(NAME, "An").containsEntry(EMAIL, "an@example.com").containsValue("ABC");
        assertThat(first).hasSize(3);
        assertThat(rows.get(0).getEmailHash()).hasSize(64);
        assertThat(rows.get(0).getCreatedByUserId()).isEqualTo(8L);
        ArgumentCaptor<CrmColumnEntity> newColumn = ArgumentCaptor.forClass(CrmColumnEntity.class);
        verify(columnRepository).save(newColumn.capture());
        assertThat(newColumn.getValue().getName()).isEqualTo("Company");
        assertThat(newColumn.getValue().getPosition()).isEqualTo(4);
        verify(auditService).record(any(), eq(CrmAuditAction.IMPORT), eq(DATASET), eq("created=2 updated=0 skipped=0 rejected=0"));
    }

    @Test
    void import_aRowWithABadCellIsRefusedAndReportedByPositionNotByValue() {
        byte[] file = csv("Name,Email\nAn,an@example.com\nBinh,not-an-email-SECRET\n,\n");

        ImportResultResponse result = service.importInto(DATASET, "leads.csv", file,
                options(DuplicatePolicy.SKIP, toColumn(0, NAME), toColumn(1, EMAIL)), head(8L, SALES));

        assertThat(result.created()).isEqualTo(1);
        assertThat(result.rejected()).isEqualTo(1);
        assertThat(result.issues()).hasSize(1);
        assertThat(result.issues().get(0).row()).isEqualTo(3);
        assertThat(result.issues().get(0).column()).isEqualTo("Email");
        assertThat(result.issues().get(0).problem()).isEqualTo("INVALID_EMAIL");
        assertThat(result.issues().toString()).doesNotContain("SECRET");
    }

    @Test
    void import_customersAlreadyInTheDatasetAreSkippedOrFilledAccordingToThePolicy() {
        Map<Long, String> existing = Map.of(NAME, "An", EMAIL, "an@example.com");
        CrmRowEntity stored = new CrmRowEntity(DATASET, COMPANY, CODEC.encode(COMPANY, existing),
                CODEC.emailHash(COMPANY, columns(), existing), null, 1L);
        setId(stored, 900L);
        CrmRowRepository.RowHashes hashes = new CrmRowRepository.RowHashes() {
            public Long getId() { return 900L; }
            public String getEmailHash() { return stored.getEmailHash(); }
            public String getPhoneHash() { return null; }
        };
        when(rowRepository.findHashesByDatasetId(DATASET)).thenReturn(List.of(hashes));
        when(rowRepository.findAllById(anyIterable())).thenReturn(List.of(stored));
        byte[] file = csv("Name,Email,Phone\nAn Nguyen,AN@example.com,0912345678\n");
        ImportOptions.ColumnMapping[] mappings = {toColumn(0, NAME), toColumn(1, EMAIL), toColumn(2, PHONE)};

        ImportResultResponse skipped = service.importInto(DATASET, "a.csv", file, options(DuplicatePolicy.SKIP, mappings), head(8L, SALES));
        assertThat(skipped.skippedDuplicates()).isEqualTo(1);
        assertThat(skipped.created()).isZero();
        assertThat(CODEC.decode(COMPANY, stored.getData())).containsEntry(NAME, "An");

        ImportResultResponse updated = service.importInto(DATASET, "a.csv", file, options(DuplicatePolicy.UPDATE, mappings), head(8L, SALES));
        assertThat(updated.updated()).isEqualTo(1);
        assertThat(updated.created()).isZero();
        assertThat(CODEC.decode(COMPANY, stored.getData())).containsEntry(NAME, "An Nguyen").containsEntry(PHONE, "0912345678");
        assertThat(stored.getPhoneHash()).hasSize(64);
    }

    @Test
    void import_theSameCustomerTwiceInOneFileIsCreatedOnce() {
        byte[] file = csv("Name,Email,Phone\nAn,an@example.com,\nAn again,AN@example.com,\nSame phone,,+84 912 345 678\nPhone twice,,0912345678\n");

        ImportResultResponse result = service.importInto(DATASET, "a.csv", file,
                options(DuplicatePolicy.UPDATE, toColumn(0, NAME), toColumn(1, EMAIL), toColumn(2, PHONE)), head(8L, SALES));

        assertThat(result.created()).isEqualTo(2);
        assertThat(result.skippedDuplicates()).isEqualTo(2);
    }

    @Test
    void import_aBadMappingIsRefusedBeforeAnythingIsSaved() {
        byte[] file = csv("Name,Email\nAn,an@example.com\n");

        assertThatThrownBy(() -> service.importInto(DATASET, "a.csv", file, options(DuplicatePolicy.SKIP, toColumn(5, NAME)), head(8L, SALES)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("mapping");
        assertThatThrownBy(() -> service.importInto(DATASET, "a.csv", file, options(DuplicatePolicy.SKIP, toColumn(0, 999L)), head(8L, SALES)))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.importInto(DATASET, "a.csv", file, options(DuplicatePolicy.SKIP, toColumn(0, NAME), toColumn(1, NAME)), head(8L, SALES)))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.importInto(DATASET, "a.csv", file, options(DuplicatePolicy.SKIP, toNew(0, "  ", CrmColumnType.TEXT)), head(8L, SALES)))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.importInto(DATASET, "a.csv", file, options(DuplicatePolicy.SKIP, toNew(0, "name", CrmColumnType.TEXT)), head(8L, SALES)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("already has a column");
        assertThatThrownBy(() -> service.importInto(DATASET, "a.csv", file,
                options(DuplicatePolicy.SKIP, new ColumnMapping(0, NAME, "also new", CrmColumnType.TEXT)), head(8L, SALES)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("not both");
        verify(rowRepository, never()).saveAll(any());
    }

    @Test
    void import_stopsWhenTheDatasetWouldOverflow() {
        when(rowRepository.countByDatasetId(DATASET)).thenReturn((long) PROPERTIES.maxRowsPerDataset());

        assertThatThrownBy(() -> service.importInto(DATASET, "a.csv", csv("Name\nAn\n"), options(DuplicatePolicy.SKIP, toColumn(0, NAME)), head(8L, SALES)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("at most");
    }

    @Test
    void import_onlyWhoManagesTheDatasetMayImportIntoIt() {
        assertThatThrownBy(() -> service.importInto(DATASET, "a.csv", csv("Name\nAn\n"), options(DuplicatePolicy.SKIP, toColumn(0, NAME)), employee(7L, SALES)))
                .isInstanceOf(AccessDeniedException.class);
        verify(rowRepository, never()).saveAll(any());
        verify(auditService, never()).record(any(), any(), any(), anyString());
    }

    @Test
    void import_aNewColumnCannotPushTheDatasetOverTheColumnLimit() {
        List<CrmColumnEntity> many = new ArrayList<>(columns());
        for (int i = 0; i < PROPERTIES.maxColumns() - 3; i++) {
            many.add(column(700L + i, DATASET, "Extra " + i, CrmColumnType.TEXT, 4 + i));
        }
        when(columnRepository.findAllActiveByDatasetId(DATASET)).thenReturn(many);

        assertThatThrownBy(() -> service.importInto(DATASET, "a.csv", csv("Name\nAn\n"), options(DuplicatePolicy.SKIP, toNew(0, "One too many", CrmColumnType.TEXT)), head(8L, SALES)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("at most");
    }
}
