package com.company.project.modules.identity.service;

import com.company.project.common.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

/**
 * Local-disk avatar storage (CLAUDE.md section 31 - file uploads). Never trusts the client's
 * filename or declared content type for anything that reaches the filesystem or the DB: the
 * extension is derived from a server-side allowlist keyed by the *sniffed* content type, and the
 * stored filename is always a fresh random UUID. Storing a real (non-dev) deployment's avatars
 * here means they live on that one instance's disk - see application.yml's `app.uploads.avatar-dir`
 * comment for why that's fine for now but not for a horizontally-scaled deployment.
 */
@Service
public class AvatarStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 2L * 1024 * 1024; // 2MB
    private static final Map<String, String> ALLOWED_CONTENT_TYPES = Map.of(
            "image/png", "png",
            "image/jpeg", "jpg",
            "image/webp", "webp");

    private final Path avatarDir;

    public AvatarStorageService(@Value("${app.uploads.avatar-dir}") String avatarDirPath) {
        this.avatarDir = Path.of(avatarDirPath).toAbsolutePath().normalize();
    }

    /** Validates, writes the file under a fresh random name, and returns that name (not a full path - callers store just this). */
    public String store(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BusinessException("AVATAR_EMPTY", "No file was uploaded", HttpStatus.BAD_REQUEST);
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BusinessException("AVATAR_TOO_LARGE", "Avatar must be 2MB or smaller", HttpStatus.BAD_REQUEST);
        }

        String sniffed = sniffContentType(file);
        String extension = sniffed == null ? null : ALLOWED_CONTENT_TYPES.get(sniffed);
        if (extension == null) {
            throw new BusinessException(
                    "AVATAR_INVALID_TYPE", "Avatar must be a PNG, JPEG, or WebP image", HttpStatus.BAD_REQUEST);
        }

        String storedFilename = UUID.randomUUID() + "." + extension;
        try {
            Files.createDirectories(avatarDir);
            Path target = avatarDir.resolve(storedFilename);
            file.transferTo(target);
            return storedFilename;
        } catch (IOException e) {
            throw new BusinessException("AVATAR_STORE_FAILED", "Could not save the uploaded avatar", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public void delete(String storedFilename) {
        if (storedFilename == null) {
            return;
        }
        try {
            Files.deleteIfExists(resolveExisting(storedFilename));
        } catch (IOException e) {
            // Best-effort cleanup - an orphaned file on disk is a non-issue; failing the request
            // that's replacing/removing the avatar reference would be the real user-facing harm.
        }
    }

    public Resolved load(String storedFilename) {
        Path path = resolveExisting(storedFilename);
        if (!Files.isRegularFile(path)) {
            throw new BusinessException("AVATAR_NOT_FOUND", "Avatar file is missing", HttpStatus.NOT_FOUND);
        }
        String contentType = ALLOWED_CONTENT_TYPES.entrySet().stream()
                .filter(e -> storedFilename.endsWith("." + e.getValue()))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse("application/octet-stream");
        try {
            return new Resolved(Files.newInputStream(path), contentType, Files.size(path));
        } catch (IOException e) {
            throw new BusinessException("AVATAR_READ_FAILED", "Could not read the avatar file", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Re-resolves against the configured directory and rejects anything that escapes it -
     * `storedFilename` only ever comes from our own UUID-based `store()` output (never a raw
     * client-supplied path), but this is cheap insurance against a future caller passing
     * something else through (CLAUDE.md section 13 - path traversal).
     */
    private Path resolveExisting(String storedFilename) {
        Path resolved = avatarDir.resolve(storedFilename).normalize();
        if (!resolved.startsWith(avatarDir)) {
            throw new BusinessException("AVATAR_INVALID_PATH", "Invalid avatar reference", HttpStatus.BAD_REQUEST);
        }
        return resolved;
    }

    /**
     * Sniffs actual image bytes rather than trusting the client-declared Content-Type header -
     * and deliberately does NOT fall back to that header when sniffing is inconclusive (`null`).
     * Falling back there would let a file whose real bytes don't match any known image format
     * sail through just because the client *claimed* `image/png`, defeating the point of
     * sniffing in the first place.
     */
    private String sniffContentType(MultipartFile file) {
        // guessContentTypeFromStream requires mark()/reset() support, which a real multipart
        // part's stream isn't guaranteed to provide (unlike MockMultipartFile's in tests, which
        // happens to use a ByteArrayInputStream) - BufferedInputStream guarantees it regardless.
        try (InputStream in = new BufferedInputStream(file.getInputStream())) {
            return java.net.URLConnection.guessContentTypeFromStream(in);
        } catch (IOException e) {
            return null;
        }
    }

    public record Resolved(InputStream data, String contentType, long sizeBytes) {
    }
}
