package com.company.project.unit.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Pins how the BCrypt encoder of the Spring Security version in use treats passwords longer than BCrypt's 72-byte input:
 * since 6.5 it refuses to encode them instead of silently cutting them, so every new password is validated as at most
 * 72 UTF-8 bytes before it gets here (see @MaxUtf8Bytes).
 */
class PasswordEncoderLimitsTest {

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Test
    void aPasswordOfExactly72BytesStillWorks() {
        String password = "p".repeat(72);
        assertThat(encoder.matches(password, encoder.encode(password))).isTrue();
    }

    @Test
    void encodingMoreThan72BytesIsRefused() {
        assertThatThrownBy(() -> encoder.encode("p".repeat(73))).isInstanceOf(IllegalArgumentException.class);
        // 25 Vietnamese letters with diacritics are 25 characters but 75 bytes
        String vietnamese = "ệ".repeat(25);
        assertThat(vietnamese.getBytes(StandardCharsets.UTF_8)).hasSize(75);
        assertThatThrownBy(() -> encoder.encode(vietnamese)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void checkingAtSignInStillComparesOnlyTheFirst72Bytes() {
        // BCrypt's own limit: matching does not refuse longer input, it compares the first 72 bytes. So a password set
        // before this upgrade (when longer ones were cut silently) still signs in; new ones can no longer exceed 72 bytes.
        String stored = encoder.encode("p".repeat(72));
        assertThat(encoder.matches("p".repeat(100), stored)).isTrue();
    }
}
