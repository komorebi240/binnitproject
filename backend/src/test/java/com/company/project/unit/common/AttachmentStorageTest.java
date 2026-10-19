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
    private static final byte[] MP4 = {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm', 0, 0, 2, 0};
    private static final byte[] MOV = {0, 0, 0, 0x14, 'f', 't', 'y', 'p', 'q', 't', ' ', ' ', 0, 0, 0, 0};
    private static final byte[] WEBM = {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3, (byte) 0x9F, 0x42, (byte) 0x86, (byte) 0x81, 1, 0, 0, 0};
    private static final long FIFTY_MB = 50L * 1024 * 1024;

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

    private AttachmentStorage videoStorage() {
        return new AttachmentStorage(tempDir.toString(), FIFTY_MB);
    }

    private static byte[] padded(byte[] header, long size) {
        byte[] content = new byte[(int) size];
        System.arraycopy(header, 0, content, 0, header.length);
        return content;
    }

    @Test
    void store_videoStoreAcceptsMp4MovAndWebmByTheirContainerSignature() {
        var mp4 = videoStorage().store(file("clip.mp4", MP4));
        var mov = videoStorage().store(file("iphone.MOV", MOV));
        var webm = videoStorage().store(file("screen.webm", WEBM));

        assertThat(mp4.video()).isTrue();
        assertThat(mp4.image()).isFalse();
        assertThat(mp4.contentType()).isEqualTo("video/mp4");
        assertThat(mov.contentType()).isEqualTo("video/quicktime");
        assertThat(mov.storedName()).endsWith(".mov");
        assertThat(webm.contentType()).isEqualTo("video/webm");
    }

    @Test
    void store_aFileNamedLikeAVideoWithoutTheSignatureIsRejected() {
        assertThatThrownBy(() -> videoStorage().store(file("clip.mp4", EXE)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("videos (MP4, MOV, WebM)");
        assertThatThrownBy(() -> videoStorage().store(file("clip.webm", MP4))).isInstanceOf(BusinessException.class);
    }

    @Test
    void store_aStoreWithoutAVideoLimitRefusesVideos() {
        assertThatThrownBy(() -> storage.store(file("clip.mp4", MP4)))
                .isInstanceOf(BusinessException.class)
                .hasMessageNotContaining("videos");
    }

    @Test
    void store_videosMayBeLargerThanOtherFilesButNotLargerThanTheirLimit() {
        long sixMb = 6L * 1024 * 1024;
        assertThat(videoStorage().store(file("clip.mp4", padded(MP4, sixMb))).sizeBytes()).isEqualTo(sixMb);

        assertThatThrownBy(() -> videoStorage().store(file("report.pdf", padded(PDF, sixMb))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("5MB");
        assertThatThrownBy(() -> videoStorage().store(file("long.mp4", padded(MP4, FIFTY_MB + 1))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("50MB");
    }

    @Test
    void load_returnsAResourceThatCanBeReadMoreThanOnce() throws Exception {
        var stored = videoStorage().store(file("clip.mp4", MP4));

        var resolved = videoStorage().load(stored.storedName());

        assertThat(resolved.sizeBytes()).isEqualTo(MP4.length);
        try (var first = resolved.resource().getInputStream(); var second = resolved.resource().getInputStream()) {
            assertThat(first.readAllBytes()).isEqualTo(MP4);
            assertThat(second.readAllBytes()).as("a byte range needs to reopen the file").isEqualTo(MP4);
        }
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
