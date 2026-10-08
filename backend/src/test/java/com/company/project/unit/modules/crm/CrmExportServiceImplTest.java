package com.company.project.unit.modules.crm;

import com.company.project.common.exception.BusinessException;
import com.company.project.modules.crm.CrmProperties;
import com.company.project.modules.crm.domain.CrmAuditAction;
import com.company.project.modules.crm.domain.CrmColumnEntity;
import com.company.project.modules.crm.domain.CrmColumnType;
import com.company.project.modules.crm.domain.CrmRowEntity;
import com.company.project.modules.crm.repository.CrmColumnRepository;
import com.company.project.modules.crm.repository.CrmDatasetRepository;
import com.company.project.modules.crm.repository.CrmRowRepository;
import com.company.project.modules.crm.service.CrmAccessPolicy;
import com.company.project.modules.crm.service.CrmAuditService;
import com.company.project.modules.crm.service.CrmExportService;
import com.company.project.modules.crm.service.impl.CrmExportServiceImpl;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.company.project.unit.modules.crm.CrmTestSupport.CODEC;
import static com.company.project.unit.modules.crm.CrmTestSupport.COMPANY;
import static com.company.project.unit.modules.crm.CrmTestSupport.OTHER_COMPANY;
import static com.company.project.unit.modules.crm.CrmTestSupport.PROPERTIES;
import static com.company.project.unit.modules.crm.CrmTestSupport.SALES;
import static com.company.project.unit.modules.crm.CrmTestSupport.column;
import static com.company.project.unit.modules.crm.CrmTestSupport.dataset;
import static com.company.project.unit.modules.crm.CrmTestSupport.employee;
import static com.company.project.unit.modules.crm.CrmTestSupport.executive;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CrmExportServiceImplTest {

    private static final Long DATASET = 5L;

    @Mock
    private CrmColumnRepository columnRepository;
    @Mock
    private CrmRowRepository rowRepository;
    @Mock
    private CrmDatasetRepository datasetRepository;
    @Mock
    private CrmAuditService auditService;

    private CrmExportServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CrmExportServiceImpl(columnRepository, rowRepository, new CrmAccessPolicy(datasetRepository), auditService, CODEC, PROPERTIES);
    }

    private List<CrmColumnEntity> columns() {
        return List.of(column(101L, DATASET, "Name", CrmColumnType.TEXT, 1), column(102L, DATASET, "Email", CrmColumnType.EMAIL, 2));
    }

    @Test
    void anExecutiveGetsAnExcelFileWithTheHeadersAndEveryCustomer() throws Exception {
        when(datasetRepository.findActiveById(DATASET)).thenReturn(Optional.of(dataset(DATASET, COMPANY, SALES, 1L)));
        when(columnRepository.findAllActiveByDatasetId(DATASET)).thenReturn(columns());
        when(rowRepository.findAllByDatasetId(DATASET)).thenReturn(List.of(
                new CrmRowEntity(DATASET, COMPANY, CODEC.encode(COMPANY, Map.of(101L, "An", 102L, "an@example.com")), null, null, 1L),
                new CrmRowEntity(DATASET, COMPANY, CODEC.encode(COMPANY, Map.of(101L, "=HYPERLINK(\"http://evil\",\"x\")")), null, null, 1L)));

        CrmExportService.ExportFile file = service.export(DATASET, executive(9L, COMPANY));

        assertThat(file.fileName()).startsWith("Leads-").endsWith(".xlsx");
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(file.content()))) {
            Sheet sheet = workbook.getSheetAt(0);
            assertThat(sheet.getSheetName()).isEqualTo("Leads");
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Name");
            assertThat(sheet.getRow(1).getCell(1).getStringCellValue()).isEqualTo("an@example.com");
            // A value that looks like a formula is stored as text, so opening the file never runs it.
            assertThat(sheet.getRow(2).getCell(0).getCellType()).isEqualTo(CellType.STRING);
            assertThat(sheet.getRow(2).getCell(0).getStringCellValue()).startsWith("=HYPERLINK");
        }
        verify(auditService).record(any(), eq(CrmAuditAction.EXPORT), eq(DATASET), eq("rows=2 columns=2"));
    }

    @Test
    void theAuditLineHoldsCountsOnly() throws Exception {
        when(datasetRepository.findActiveById(DATASET)).thenReturn(Optional.of(dataset(DATASET, COMPANY, SALES, 1L)));
        when(columnRepository.findAllActiveByDatasetId(DATASET)).thenReturn(columns());
        when(rowRepository.findAllByDatasetId(DATASET)).thenReturn(List.of(
                new CrmRowEntity(DATASET, COMPANY, CODEC.encode(COMPANY, Map.of(101L, "Secret Name")), null, null, 1L)));

        service.export(DATASET, executive(9L, COMPANY));

        var detail = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(auditService).record(any(), eq(CrmAuditAction.EXPORT), eq(DATASET), detail.capture());
        assertThat(detail.getValue()).doesNotContain("Secret");
    }

    @Test
    void aDatasetTooBigForOneFileIsRefused() {
        when(datasetRepository.findActiveById(DATASET)).thenReturn(Optional.of(dataset(DATASET, COMPANY, SALES, 1L)));
        when(rowRepository.countByDatasetId(DATASET)).thenReturn((long) PROPERTIES.exportMaxRows() + 1);

        assertThatThrownBy(() -> service.export(DATASET, executive(9L, COMPANY)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("cannot be exported");
    }

    @Test
    void aDatasetOfAnotherCompanyIsNotFoundEvenForAnExecutive() {
        when(datasetRepository.findActiveById(DATASET)).thenReturn(Optional.of(dataset(DATASET, COMPANY, SALES, 1L)));

        assertThatThrownBy(() -> service.export(DATASET, executive(9L, OTHER_COMPANY)))
                .isInstanceOf(com.company.project.common.exception.ResourceNotFoundException.class);
    }

    @Test
    void anEmployeeOfTheDepartmentCannotExportEvenThoughTheyCanUseTheDataset() {
        when(datasetRepository.findActiveById(DATASET)).thenReturn(Optional.of(dataset(DATASET, COMPANY, SALES, 1L)));

        assertThatThrownBy(() -> service.export(DATASET, employee(7L, SALES))).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void theLimitsComeFromTheConfiguration() {
        CrmProperties tiny = new CrmProperties(PROPERTIES.dataKey(), 100, 5_242_880, 1000, 6, 1);
        CrmExportServiceImpl limited = new CrmExportServiceImpl(columnRepository, rowRepository, new CrmAccessPolicy(datasetRepository), auditService, CODEC, tiny);
        when(datasetRepository.findActiveById(DATASET)).thenReturn(Optional.of(dataset(DATASET, COMPANY, SALES, 1L)));
        when(rowRepository.countByDatasetId(DATASET)).thenReturn(2L);

        assertThatThrownBy(() -> limited.export(DATASET, executive(9L, COMPANY))).isInstanceOf(BusinessException.class);
    }
}
