package com.company.project.unit.modules.crm;

import com.company.project.modules.crm.domain.CrmColumnType;
import com.company.project.modules.crm.service.CrmCells;
import com.company.project.modules.crm.service.CrmCells.Problem;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CrmCellsTest {

    private static CrmCells.Result check(CrmColumnType type, String raw) {
        return CrmCells.normalize(type, raw);
    }

    @Test
    void aBlankCellIsFineForEveryType() {
        for (CrmColumnType type : CrmColumnType.values()) {
            assertThat(check(type, null).problem()).isNull();
            assertThat(check(type, "   ").value()).isEmpty();
        }
    }

    @Test
    void textIsTrimmedAndLimited() {
        assertThat(check(CrmColumnType.TEXT, "  Nguyen Van A  ").value()).isEqualTo("Nguyen Van A");
        assertThat(check(CrmColumnType.TEXT, "x".repeat(2001)).problem()).isEqualTo(Problem.TOO_LONG);
        assertThat(check(CrmColumnType.TEXT, "x".repeat(2000)).problem()).isNull();
    }

    @Test
    void numbersAcceptADotOrACommaAndAreStoredPlainly() {
        assertThat(check(CrmColumnType.NUMBER, "1000.50").value()).isEqualTo("1000.5");
        assertThat(check(CrmColumnType.NUMBER, "1 000,5").value()).isEqualTo("1000.5");
        assertThat(check(CrmColumnType.NUMBER, "-12").value()).isEqualTo("-12");
        assertThat(check(CrmColumnType.NUMBER, "10").value()).isEqualTo("10");
        assertThat(check(CrmColumnType.NUMBER, "0.000").value()).isEqualTo("0");
        assertThat(check(CrmColumnType.NUMBER, "1.234,56").problem()).isEqualTo(Problem.INVALID_NUMBER);
        assertThat(check(CrmColumnType.NUMBER, "12abc").problem()).isEqualTo(Problem.INVALID_NUMBER);
        assertThat(check(CrmColumnType.NUMBER, "=1+1").problem()).isEqualTo(Problem.INVALID_NUMBER);
    }

    @Test
    void datesAreReadInTheCommonLayoutsAndStoredAsIso() {
        assertThat(check(CrmColumnType.DATE, "2026-10-08").value()).isEqualTo("2026-10-08");
        assertThat(check(CrmColumnType.DATE, "8/10/2026").value()).isEqualTo("2026-10-08");
        assertThat(check(CrmColumnType.DATE, "08-10-2026").value()).isEqualTo("2026-10-08");
        assertThat(check(CrmColumnType.DATE, "8.10.2026").value()).isEqualTo("2026-10-08");
        assertThat(check(CrmColumnType.DATE, "31/02/2026").problem()).isEqualTo(Problem.INVALID_DATE);
        assertThat(check(CrmColumnType.DATE, "yesterday").problem()).isEqualTo(Problem.INVALID_DATE);
        assertThat(check(CrmColumnType.DATE, "01/01/1800").problem()).isEqualTo(Problem.INVALID_DATE);
    }

    @Test
    void emailsAreLowerCasedAndMustLookLikeEmails() {
        assertThat(check(CrmColumnType.EMAIL, " An@Example.COM ").value()).isEqualTo("an@example.com");
        assertThat(check(CrmColumnType.EMAIL, "not-an-email").problem()).isEqualTo(Problem.INVALID_EMAIL);
        assertThat(check(CrmColumnType.EMAIL, "a b@example.com").problem()).isEqualTo(Problem.INVALID_EMAIL);
        assertThat(check(CrmColumnType.EMAIL, "a@b").problem()).isEqualTo(Problem.INVALID_EMAIL);
    }

    @Test
    void phonesNeedBetweenEightAndFifteenDigitsAndOnlyPhoneCharacters() {
        assertThat(check(CrmColumnType.PHONE, "+84 912 345 678").problem()).isNull();
        assertThat(check(CrmColumnType.PHONE, "(028) 3822-1234").problem()).isNull();
        assertThat(check(CrmColumnType.PHONE, "12345").problem()).isEqualTo(Problem.INVALID_PHONE);
        assertThat(check(CrmColumnType.PHONE, "09123x4567").problem()).isEqualTo(Problem.INVALID_PHONE);
        assertThat(check(CrmColumnType.PHONE, "1234567890123456").problem()).isEqualTo(Problem.INVALID_PHONE);
    }

    @Test
    void theSamePhoneWrittenDifferentlyHasOneCanonicalForm() {
        assertThat(CrmCells.phoneDigits("+84 912 345 678")).isEqualTo("0912345678");
        assertThat(CrmCells.phoneDigits("0912.345.678")).isEqualTo("0912345678");
        assertThat(CrmCells.phoneDigits("84912345678")).isEqualTo("0912345678");
        assertThat(CrmCells.phoneDigits("0084912345678")).isEqualTo("0912345678");
        assertThat(CrmCells.phoneDigits("+1 202 555 0143")).isEqualTo("12025550143");
    }
}
