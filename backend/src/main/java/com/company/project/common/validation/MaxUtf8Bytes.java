package com.company.project.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * The string is at most {@link #value()} bytes once encoded as UTF-8 ({@code null} is left to @NotBlank). Used for new
 * passwords: BCrypt reads only 72 bytes and Spring Security refuses to encode more, and a Vietnamese letter with a
 * diacritic takes 2-3 bytes, so a character count (@Size) is not enough.
 */
@Documented
@Constraint(validatedBy = MaxUtf8BytesValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface MaxUtf8Bytes {

    int value();

    String message() default "is too long";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
