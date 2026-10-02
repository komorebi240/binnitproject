package com.company.project.unit.common;

import com.company.project.common.exception.BusinessException;
import com.company.project.common.storage.AttachmentStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AttachmentStorageTest {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 0, 0, 0, 0};
    private static final byte[] PDF = "%PDF-1.7 sample".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] EXE = {'M', 'Z', (byte) 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0};

    @TempDir
    Path tempDir;

    private AttachmentStorage storage;

    @BeforeEach
    void setUp() {
        storage = new AttachmentStorage(tempDir.toString());
    }

    private static MockMultipartFile file(String name, byte[] content) {
        return new MockMultipartFile("file", name, "application/octet-stream", content);
    }

    @Test
    void store_acceptsPngByItsBytesAndIgnoresTheClientExtension() {
        var stored = storage.store(file("holiday.txt", PNG));

        assertThat(stored.image()).isTrue();
        assertThat(stored.contentType()).isEqualTo("image/png");
        assertThat(stored.storedName()).endsWith(".png").doesNotContain("holiday");
        assertThat(Files.exists(tempDir.resolve(stored.storedName()))).isTrue();
    }

    @Test
    void store_acceptsPdfWithMatchingBytes() {
        var stored = storage.store(file("report.PDF", PDF));

        assertThat(stored.image()).isFalse();
        assertThat(stored.contentType()).isEqualTo("application/pdf");
        assertThat(stored.displayName()).isEqualTo("report.PDF");
    }

    @Test
    void store_rejectsExecutableEvenWhenRenamedToAnAllowedExtension() {
        assertThatThrownBy(() -> storage.store(file("invoice.pdf", EXE)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only images");
    }

    @Test
    void store_rejectsDisallowedExtension() {
        assertThatThrownBy(() -> storage.store(file("run.exe", EXE))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> storage.store(file("page.html", "<script>1</script>".getBytes(StandardCharsets.UTF_8))))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void store_rejectsBinaryContentPassedOffAsText() {
        assertThatThrownBy(() -> storage.store(file("notes.txt", new byte[] {'a', 0, 'b'})))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void store_rejectsOversizedAndEmptyFiles() {
        byte[] big = new byte[(int) AttachmentStorage.MAX_FILE_SIZE_BYTES + 1];
        System.arraycopy(PNG, 0, big, 0, PNG.length);

        assertThatThrownBy(() -> storage.store(file("big.png", big))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> storage.store(file("empty.txt", new byte[0]))).isInstanceOf(BusinessException.class);
    }

    @Test
    void store_stripsPathAndControlCharactersFromTheDisplayName() {
        var stored = storage.store(file("..\\..\\evil/dir/na\"me.pdf", PDF));

        assertThat(stored.displayName()).isEqualTo("name.pdf");
        assertThat(stored.storedName()).doesNotContain("/").doesNotContain("\\");
    }

    @Test
    void load_rejectsPathTraversal() {
        assertThatThrownBy(() -> storage.load("../secret.txt")).isInstanceOf(BusinessException.class);
    }

    @Test
    void delete_removesTheStoredFile() {
        var stored = storage.store(file("a.png", PNG));

        storage.delete(stored.storedName());

        assertThat(Files.exists(tempDir.resolve(stored.storedName()))).isFalse();
    }
}
