package com.company.project.unit.modules.tasks;

import com.company.project.common.exception.BusinessException;
import com.company.project.modules.tasks.service.DriveUrlPolicy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DriveUrlPolicyTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "https://drive.google.com/file/d/1AbC/view?usp=sharing",
            "https://docs.google.com/document/d/1AbC/edit",
            "HTTPS://Drive.Google.com/drive/folders/xyz"})
    void acceptsHttpsGoogleDriveAndDocsLinks(String url) {
        assertThat(DriveUrlPolicy.normalizeOrReject(url)).isEqualTo(url);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "http://drive.google.com/file/d/1",
            "javascript:alert(1)",
            "data:text/html,<script>alert(1)</script>",
            "https://example.com/file",
            "https://drive.google.com.evil.com/file",
            "https://user:pw@drive.google.com/file",
            "//drive.google.com/file",
            "drive.google.com/file",
            "https://drive.google.com/a b"})
    void rejectsEverythingElse(String url) {
        assertThatThrownBy(() -> DriveUrlPolicy.normalizeOrReject(url)).isInstanceOf(BusinessException.class);
    }

    @Test
    void blankClearsTheLink() {
        assertThat(DriveUrlPolicy.normalizeOrReject(null)).isNull();
        assertThat(DriveUrlPolicy.normalizeOrReject("  ")).isNull();
    }

    @Test
    void tooLongIsRejected() {
        String tooLong = "https://drive.google.com/" + "a".repeat(DriveUrlPolicy.MAX_LENGTH);
        assertThatThrownBy(() -> DriveUrlPolicy.normalizeOrReject(tooLong)).isInstanceOf(BusinessException.class);
    }
}
