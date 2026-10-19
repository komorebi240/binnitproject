package com.company.project.unit.modules.identity;

import com.company.project.modules.identity.dto.request.ChangePasswordRequest;
import com.company.project.modules.identity.dto.request.ForgotPasswordRequest;
import com.company.project.modules.identity.dto.request.LoginRequest;
import com.company.project.modules.identity.dto.request.ResetPasswordRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Security review finding: the public sign-in endpoints accepted usernames of any length, and each one became a
 * rate-limit key held in memory. They are now capped (100 = users.username; 200 = users.email for "username or email").
 */
class AuthRequestLimitsTest {

    private static jakarta.validation.ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @Test
    void loginAcceptsTheLongestRealUsernameAndRefusesLonger() {
        assertThat(validator.validate(new LoginRequest("u".repeat(100), "secret-password"))).isEmpty();
        assertThat(validator.validate(new LoginRequest("u".repeat(101), "secret-password")))
                .extracting(v -> v.getPropertyPath().toString()).containsExactly("username");
        assertThat(validator.validate(new LoginRequest("u".repeat(1_000_000), "x"))).isNotEmpty();
    }

    @Test
    void loginRefusesAnAbsurdlyLongPassword() {
        assertThat(validator.validate(new LoginRequest("member", "p".repeat(129))))
                .extracting(v -> v.getPropertyPath().toString()).containsExactly("password");
    }

    @Test
    void aNewPasswordMayBe72BytesButNotMore_countingAccentedLettersAsTheyAreStored() {
        // Spring Security 6.5 refuses to BCrypt more than 72 bytes; without this check that was a 500.
        assertThat(validator.validate(new ChangePasswordRequest("old-password", "p".repeat(72)))).isEmpty();
        assertThat(validator.validate(new ChangePasswordRequest("old-password", "p".repeat(73))))
                .extracting(v -> v.getPropertyPath().toString()).containsExactly("newPassword");
        assertThat(validator.validate(new ChangePasswordRequest("old-password", "ệ".repeat(24)))).as("24 x 3 bytes").isEmpty();
        assertThat(validator.validate(new ChangePasswordRequest("old-password", "ệ".repeat(25))))
                .as("25 characters, 75 bytes").isNotEmpty();
        assertThat(validator.validate(new ResetPasswordRequest("member", "123456", "ệ".repeat(25))))
                .extracting(v -> v.getPropertyPath().toString()).containsExactly("newPassword");
    }

    @Test
    void forgotAndResetAcceptAnEmailLengthIdentifierAndRefuseLonger() {
        assertThat(validator.validate(new ForgotPasswordRequest("e".repeat(200)))).isEmpty();
        assertThat(validator.validate(new ForgotPasswordRequest("e".repeat(201)))).isNotEmpty();
        assertThat(validator.validate(new ResetPasswordRequest("e".repeat(201), "123456", "new-password-1")))
                .extracting(v -> v.getPropertyPath().toString()).containsExactly("username");
        assertThat(validator.validate(new ResetPasswordRequest("member", "1".repeat(13), "new-password-1")))
                .extracting(v -> v.getPropertyPath().toString()).containsExactly("otp");
    }
}
