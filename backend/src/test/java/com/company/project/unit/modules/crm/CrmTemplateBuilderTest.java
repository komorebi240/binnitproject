package com.company.project.unit.modules.crm;

import com.company.project.modules.crm.file.CrmFileReader;
import com.company.project.modules.crm.file.CrmTemplateBuilder;
import com.company.project.modules.crm.file.ParsedTable;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.ResourceBundleMessageSource;

import java.util.List;
import java.util.Locale;

import static com.company.project.unit.modules.crm.CrmTestSupport.PROPERTIES;
import static org.assertj.core.api.Assertions.assertThat;

/** The demonstration files must be importable by the importer they teach people to use. */
class CrmTemplateBuilderTest {

    private final CrmFileReader reader = new CrmFileReader(PROPERTIES);
    private final CrmTemplateBuilder builder = new CrmTemplateBuilder(messages(), PROPERTIES);

    private static ResourceBundleMessageSource messages() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        return source;
    }

    @Test
    void theExcelTemplateReadsBackAsATableWithTwoSampleCustomers() {
        List<ParsedTable> tables = reader.read("template.xlsx", builder.excel(Locale.ENGLISH));

        // The guide sheet is a table too (one column of text); the data sheet comes first.
        ParsedTable data = tables.get(0);
        assertThat(data.name()).isEqualTo("Customers");
        assertThat(data.headers()).containsExactly("Full name", "Email", "Phone", "Company", "Note");
        assertThat(data.rows()).hasSize(2);
        assertThat(data.rows().get(0).get(1)).isEqualTo("an.nguyen@example.com");
    }

    @Test
    void theWordTemplateHasTheSameTableAndItsGuideIsNotImportedAsData() {
        List<ParsedTable> tables = reader.read("template.docx", builder.word(Locale.ENGLISH));

        assertThat(tables).hasSize(1);
        assertThat(tables.get(0).headers()).containsExactly("Full name", "Email", "Phone", "Company", "Note");
        assertThat(tables.get(0).rows()).hasSize(2);
    }

    @Test
    void theTemplatesSpeakTheLanguageOfTheRequestAndFillInTheLimits() {
        List<ParsedTable> vietnamese = reader.read("template.xlsx", builder.excel(Locale.forLanguageTag("vi")));
        List<ParsedTable> english = reader.read("template.xlsx", builder.excel(Locale.ENGLISH));

        assertThat(vietnamese.get(0).headers().get(0)).isEqualTo("Họ tên");
        assertThat(vietnamese.get(0).name()).isEqualTo("Khách hàng");
        ParsedTable guide = english.get(1);
        String guideText = guide.headers().toString() + guide.rows();
        assertThat(guideText).contains("100 rows").contains("5 MB").doesNotContain("{0}");
    }
}
