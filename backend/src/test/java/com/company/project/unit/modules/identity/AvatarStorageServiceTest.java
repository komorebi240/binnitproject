package com.company.project.unit.modules.identity;

import com.company.project.common.exception.BusinessException;
import com.company.project.modules.identity.service.AvatarStorageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** A 1x1 PNG's real magic bytes are used so the content-sniffing in store() genuinely detects
 * image/png rather than trusting the client-declared Content-Type header. */
class AvatarStorageServiceTest {

    private static final byte[] PNG_MAGIC_BYTES = {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0, 0, 0, 0, 0, 0, 0, 0,
    };

    private Path tempDir;
    private AvatarStorageService service;

    @BeforeEach
    void setUp() throws IOException {
        tempDir = Files.createTempDirectory("avatar-test");
        service = new AvatarStorageService(tempDir.toString());
    }

    @AfterEach
    void tearDown() throws IOException {
        if (Files.exists(tempDir)) {
            try (var paths = Files.walk(tempDir)) {
                paths.sorted(Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
            }
        }
    }

    @Test
    void storesAValidPngAndReturnsAUuidFilenameWithTheRightExtension() {
        var file = new MockMultipartFile("file", "whatever-the-client-called-it.png", "image/png", PNG_MAGIC_BYTES);

        String stored = service.store(file);

        assertThat(stored).endsWith(".png");
        assertThat(stored).isNotEqualTo("whatever-the-client-called-it.png");
        assertThat(Files.exists(tempDir.resolve(stored))).isTrue();
    }

    @Test
    void rejectsAnEmptyFile() {
        var file = new MockMultipartFile("file", "a.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> service.store(file)).isInstanceOf(BusinessException.class);
    }

    @Test
    void rejectsAFileOverTheSizeLimit() {
        byte[] tooBig = new byte[3 * 1024 * 1024];
        var file = new MockMultipartFile("file", "a.png", "image/png", tooBig);

        assertThatThrownBy(() -> service.store(file)).isInstanceOf(BusinessException.class);
    }

    @Test
    void rejectsContentWhoseRealBytesArentAnAllowedImageTypeRegardlessOfTheDeclaredContentType() {
        var file = new MockMultipartFile("file", "a.png", "image/png", "<script>alert(1)</script>".getBytes());

        assertThatThrownBy(() -> service.store(file)).isInstanceOf(BusinessException.class);
    }

    @Test
    void loadReturnsTheStoredBytesWithTheCorrectContentType() throws IOException {
        var file = new MockMultipartFile("file", "a.png", "image/png", PNG_MAGIC_BYTES);
        String stored = service.store(file);

        AvatarStorageService.Resolved resolved = service.load(stored);

        assertThat(resolved.contentType()).isEqualTo("image/png");
        try (InputStream in = resolved.data()) {
            assertThat(in.readAllBytes()).isEqualTo(PNG_MAGIC_BYTES);
        }
    }

    @Test
    void loadThrowsForAFilenameThatWasNeverStored() {
        assertThatThrownBy(() -> service.load("does-not-exist.png")).isInstanceOf(BusinessException.class);
    }

    @Test
    void deleteIsANoOpForANullOrMissingFilename() {
        service.delete(null);
        service.delete("never-existed.png");
        // No exception - best-effort cleanup, see AvatarStorageService.delete's javadoc.
    }

    /**
     * Regression test for a real bug caught by manual curl testing, not by the tests above:
     * MockMultipartFile's getInputStream() happens to return a mark/reset-capable
     * ByteArrayInputStream, but a real multipart request's part is not guaranteed to - sniffing
     * must not silently misdetect (or blow up) just because the underlying stream can't be
     * reset. This file's bytes don't support mark/reset at all, simulating that gap.
     */
    @Test
    void sniffsCorrectlyEvenWhenTheUnderlyingStreamDoesNotSupportMarkReset() {
        MultipartFile file = new NoMarkSupportMultipartFile(PNG_MAGIC_BYTES);

        String stored = service.store(file);

        assertThat(stored).endsWith(".png");
    }

    private static final class NoMarkSupportMultipartFile implements MultipartFile {
        private final byte[] bytes;

        NoMarkSupportMultipartFile(byte[] bytes) {
            this.bytes = bytes;
        }

        @Override
        public String getName() {
            return "file";
        }

        @Override
        public String getOriginalFilename() {
            return "a.png";
        }

        @Override
        public String getContentType() {
            return "image/png";
        }

        @Override
        public boolean isEmpty() {
            return bytes.length == 0;
        }

        @Override
        public long getSize() {
            return bytes.length;
        }

        @Override
        public byte[] getBytes() {
            return bytes;
        }

        @Override
        public InputStream getInputStream() {
            return new FilterInputStream(new ByteArrayInputStream(bytes)) {
                @Override
                public boolean markSupported() {
                    return false;
                }

                @Override
                public synchronized void mark(int readlimit) {
                    // no-op - markSupported() is false, so a well-behaved caller never calls this
                }

                @Override
                public synchronized void reset() throws IOException {
                    throw new IOException("mark/reset not supported");
                }
            };
        }

        @Override
        public void transferTo(File dest) throws IOException {
            Files.write(dest.toPath(), bytes);
        }
    }
}
