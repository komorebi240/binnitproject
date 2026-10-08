package com.company.project.modules.crm.service;

import com.company.project.modules.crm.domain.CrmColumnType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * What a typed-in or imported cell may contain, per column type, and how it is stored. Pure functions: the same rules
 * apply to a cell typed by hand, read from Excel, from a CSV or from a Word table.
 */
public final class CrmCells {

    public static final int MAX_LENGTH = 2000;

    /** Why a cell was refused; the codes are shown to people (translated by the frontend), never the value itself. */
    public enum Problem {
        TOO_LONG,
        INVALID_NUMBER,
        INVALID_DATE,
        INVALID_EMAIL,
        INVALID_PHONE
    }

    /** {@code value} is the text to store (empty when the cell is blank); {@code problem} is null when the cell is fine. */
    public record Result(String value, Problem problem) {
        static Result ok(String value) {
            return new Result(value, null);
        }

        static Result bad(Problem problem) {
            return new Result("", problem);
        }
    }

    private static final Pattern NUMBER = Pattern.compile("[+-]?\\d+([.,]\\d+)?");
    private static final Pattern EMAIL = Pattern.compile("[^@\\s]+@[^@\\s]+\\.[^@\\s]+");
    private static final Pattern PHONE_CHARS = Pattern.compile("[0-9 +().\\-]+");
    private static final int MIN_PHONE_DIGITS = 8;
    private static final int MAX_PHONE_DIGITS = 15;
    private static final int MAX_EMAIL_LENGTH = 200;
    private static final int MIN_YEAR = 1900;
    private static final int MAX_YEAR = 2200;

    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            strict("uuuu-M-d"), strict("d/M/uuuu"), strict("d-M-uuuu"), strict("d.M.uuuu"));

    private CrmCells() {
    }

    private static DateTimeFormatter strict(String pattern) {
        return DateTimeFormatter.ofPattern(pattern, Locale.ROOT).withResolverStyle(ResolverStyle.STRICT);
    }

    public static Result normalize(CrmColumnType type, String raw) {
        String text = raw == null ? "" : raw.strip();
        if (text.isEmpty()) {
            return Result.ok("");
        }
        if (text.length() > MAX_LENGTH) {
            return Result.bad(Problem.TOO_LONG);
        }
        return switch (type) {
            case TEXT -> Result.ok(text);
            case NUMBER -> number(text);
            case DATE -> date(text);
            case EMAIL -> email(text);
            case PHONE -> phone(text);
        };
    }

    private static Result number(String text) {
        String compact = text.replace(" ", "");
        if (!NUMBER.matcher(compact).matches()) {
            return Result.bad(Problem.INVALID_NUMBER);
        }
        BigDecimal value = new BigDecimal(compact.replace(',', '.'));
        // 1000.50 -> 1000.5, 10 -> 10 (and never 1E+1)
        String plain = value.signum() == 0 ? "0" : value.stripTrailingZeros().toPlainString();
        return Result.ok(plain);
    }

    private static Result date(String text) {
        for (DateTimeFormatter format : DATE_FORMATS) {
            try {
                LocalDate date = LocalDate.parse(text, format);
                if (date.getYear() < MIN_YEAR || date.getYear() > MAX_YEAR) {
                    return Result.bad(Problem.INVALID_DATE);
                }
                return Result.ok(date.toString());
            } catch (DateTimeParseException ignored) {
                // try the next accepted layout
            }
        }
        return Result.bad(Problem.INVALID_DATE);
    }

    private static Result email(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.length() > MAX_EMAIL_LENGTH || !EMAIL.matcher(lower).matches()) {
            return Result.bad(Problem.INVALID_EMAIL);
        }
        return Result.ok(lower);
    }

    private static Result phone(String text) {
        if (!PHONE_CHARS.matcher(text).matches()) {
            return Result.bad(Problem.INVALID_PHONE);
        }
        int digits = phoneDigits(text).length();
        if (digits < MIN_PHONE_DIGITS || digits > MAX_PHONE_DIGITS) {
            return Result.bad(Problem.INVALID_PHONE);
        }
        return Result.ok(text);
    }

    /**
     * The digits of a phone number in one canonical form, so "+84 912 345 678", "0912.345.678" and "84912345678" are the
     * same customer: a leading Vietnam country code (84 or 0084) becomes the national leading 0.
     */
    public static String phoneDigits(String phone) {
        String digits = phone.replaceAll("\\D", "");
        if (digits.startsWith("0084") && digits.length() >= 13) {
            return "0" + digits.substring(4);
        }
        if (digits.startsWith("84") && digits.length() >= 11) {
            return "0" + digits.substring(2);
        }
        return digits;
    }
}
