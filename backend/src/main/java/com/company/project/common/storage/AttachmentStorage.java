package com.company.project.common.storage;

import com.company.project.common.exception.BusinessException;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Local-disk storage for user-uploaded attachments - one instance per feature directory, see
 * StorageConfig (CLAUDE.md section 31). Nothing client-supplied reaches
 * the filesystem: the stored name is a random UUID plus an extension chosen from a server-side
 * allowlist, and the file's leading bytes ("magic numbers") must match the type its extension
 * claims - a renamed executable is rejected. Images are identified purely by their bytes (SVG is
 * deliberately not allowed: it can carry script). Videos (MP4, MOV, WebM) are accepted only by a store created with a
 * video size limit (chat), each checked against its container's signature; they are never transcoded, so a codec the
 * browser cannot play is simply offered as a download. Same single-instance-disk caveat as avatars.
 */
public class AttachmentStorage {

    public static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final int HEADER_BYTES = 16;
    private static final int TEXT_SCAN_BYTES = 8192;
    private static final int MAX_DISPLAY_NAME_LENGTH = 150;

    private enum Kind { PNG, JPEG, GIF, WEBP, PDF, OLE, ZIP, TEXT }

    private record DocumentType(Kind kind, String contentType) {
    }

    /** {@code isoMedia}: MP4/MOV start with an ISO base media "ftyp" box; otherwise the file is WebM (EBML header). */
    private record VideoType(String contentType, boolean isoMedia) {
    }

    private static final Map<String, VideoType> VIDEO_TYPES = Map.of(
            "mp4", new VideoType("video/mp4", true),
            "m4v", new VideoType("video/mp4", true),
            "mov", new VideoType("video/quicktime", true),
            "webm", new VideoType("video/webm", false));

    private static final Map<Kind, String> IMAGE_EXTENSIONS = Map.of(
            Kind.PNG, "png", Kind.JPEG, "jpg", Kind.GIF, "gif", Kind.WEBP, "webp");
    private static final Map<Kind, String> IMAGE_CONTENT_TYPES = Map.of(
            Kind.PNG, "image/png", Kind.JPEG, "image/jpeg", Kind.GIF, "image/gif", Kind.WEBP, "image/webp");

    private static final Map<String, DocumentType> DOCUMENT_TYPES = Map.ofEntries(
            Map.entry("pdf", new DocumentType(Kind.PDF, "application/pdf")),
            Map.entry("doc", new DocumentType(Kind.OLE, "application/msword")),
            Map.entry("xls", new DocumentType(Kind.OLE, "application/vnd.ms-excel")),
            Map.entry("ppt", new DocumentType(Kind.OLE, "application/vnd.ms-powerpoint")),
            Map.entry("docx", new DocumentType(Kind.ZIP, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")),
            Map.entry("xlsx", new DocumentType(Kind.ZIP, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
            Map.entry("pptx", new DocumentType(Kind.ZIP, "application/vnd.openxmlformats-officedocument.presentationml.presentation")),
            Map.entry("zip", new DocumentType(Kind.ZIP, "application/zip")),
            Map.entry("txt", new DocumentType(Kind.TEXT, "text/plain")),
            Map.entry("csv", new DocumentType(Kind.TEXT, "text/csv")));

    private final Path directory;
    /** 0 = this store accepts no videos (tasks); otherwise the largest video it accepts (chat). */
    private final long maxVideoBytes;

    public AttachmentStorage(String directoryPath) {
        this(directoryPath, 0);
    }

    public AttachmentStorage(String directoryPath, long maxVideoBytes) {
        this.directory = Path.of(directoryPath).toAbsolutePath().normalize();
        this.maxVideoBytes = maxVideoBytes;
    }

    /** What was stored; {@code contentType} is the server-decided type, never the client's. */
    public record Stored(String storedName, String displayName, String contentType, long sizeBytes, boolean image, boolean video) {
    }

    /** A file Spring can serve in byte ranges (what a video player asks for when it seeks). */
    public record Resolved(Resource resource, long sizeBytes) {
    }

    public Stored store(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BusinessException("ATTACHMENT_EMPTY", "No file was uploaded", HttpStatus.BAD_REQUEST);
        }
        if (file.getSize() > Math.max(MAX_FILE_SIZE_BYTES, maxVideoBytes)) {
            throw tooLarge();
        }

        String extension = extensionOf(file.getOriginalFilename());
        Kind imageKind;
        String storedExtension;
        String contentType;
        boolean video = false;
        // BufferedInputStream guarantees mark/reset, which a real multipart part does not.
        try (InputStream in = new BufferedInputStream(file.getInputStream())) {
            in.mark(TEXT_SCAN_BYTES + 1);
            byte[] header = in.readNBytes(HEADER_BYTES);
            imageKind = sniffImage(header);
            if (imageKind != null) {
                storedExtension = IMAGE_EXTENSIONS.get(imageKind);
                contentType = IMAGE_CONTENT_TYPES.get(imageKind);
            } else if (maxVideoBytes > 0 && extension != null && VIDEO_TYPES.containsKey(extension)) {
                VideoType videoType = VIDEO_TYPES.get(extension);
                if (!(videoType.isoMedia() ? isIsoMedia(header) : startsWith(header, 0x1A, 0x45, 0xDF, 0xA3))) {
                    throw invalidType();
                }
                video = true;
                storedExtension = extension;
                contentType = videoType.contentType();
            } else {
                DocumentType document = extension == null ? null : DOCUMENT_TYPES.get(extension);
                if (document == null) {
                    throw invalidType();
                }
                in.reset();
                if (!matchesDocumentKind(document.kind(), in)) {
                    throw invalidType();
                }
                storedExtension = extension;
                contentType = document.contentType();
            }
        } catch (IOException e) {
            throw new BusinessException("ATTACHMENT_READ_FAILED", "Could not read the uploaded file", HttpStatus.BAD_REQUEST);
        }
        if (file.getSize() > (video ? maxVideoBytes : MAX_FILE_SIZE_BYTES)) {
            throw tooLarge();
        }

        String storedName = UUID.randomUUID() + "." + storedExtension;
        try {
            Files.createDirectories(directory);
            file.transferTo(directory.resolve(storedName));
        } catch (IOException e) {
            throw new BusinessException("ATTACHMENT_STORE_FAILED", "Could not save the uploaded file", HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return new Stored(
                storedName, displayName(file.getOriginalFilename(), storedExtension), contentType, file.getSize(), imageKind != null, video);
    }

    public void delete(String storedName) {
        if (storedName == null) {
            return;
        }
        try {
            Files.deleteIfExists(resolve(storedName));
        } catch (IOException e) {
            // Best-effort: an orphaned file is harmless; failing the recall/rollback over it is not.
        }
    }

    public Resolved load(String storedName) {
        Path path = resolve(storedName);
        if (!Files.isRegularFile(path)) {
            throw new BusinessException("ATTACHMENT_NOT_FOUND", "Attachment file is missing", HttpStatus.NOT_FOUND);
        }
        try {
            return new Resolved(new FileSystemResource(path), Files.size(path));
        } catch (IOException e) {
            throw new BusinessException("ATTACHMENT_READ_FAILED", "Could not read the attachment", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private Path resolve(String storedName) {
        Path resolved = directory.resolve(storedName).normalize();
        if (!resolved.startsWith(directory)) {
            throw new BusinessException("ATTACHMENT_INVALID_PATH", "Invalid attachment reference", HttpStatus.BAD_REQUEST);
        }
        return resolved;
    }

    private BusinessException invalidType() {
        return new BusinessException(
                "ATTACHMENT_INVALID_TYPE",
                "Only images (PNG, JPEG, GIF, WebP)" + (maxVideoBytes > 0 ? ", videos (MP4, MOV, WebM)" : "")
                        + " and PDF, Word, Excel, PowerPoint, ZIP, TXT, CSV files are allowed",
                HttpStatus.BAD_REQUEST);
    }

    private BusinessException tooLarge() {
        String limits = maxVideoBytes > 0
                ? "Files must be 5MB or smaller, videos " + maxVideoBytes / (1024 * 1024) + "MB or smaller"
                : "Attachment must be 5MB or smaller";
        return new BusinessException("ATTACHMENT_TOO_LARGE", limits, HttpStatus.BAD_REQUEST);
    }

    /** MP4 and MOV: bytes 4-7 are the "ftyp" box type that opens every ISO base media file. */
    private static boolean isIsoMedia(byte[] h) {
        return h.length >= 8 && h[4] == 'f' && h[5] == 't' && h[6] == 'y' && h[7] == 'p';
    }

    private static String extensionOf(String originalFilename) {
        if (originalFilename == null) {
            return null;
        }
        int dot = originalFilename.lastIndexOf('.');
        if (dot < 0 || dot == originalFilename.length() - 1) {
            return null;
        }
        return originalFilename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    /** Name shown in the UI / used in Content-Disposition: path and control characters stripped. */
    private static String displayName(String originalFilename, String fallbackExtension) {
        String name = originalFilename == null ? "" : originalFilename;
        name = name.substring(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1);
        name = name.replaceAll("[\\p{Cntrl}\"<>:|?*]", "").trim();
        if (name.length() > MAX_DISPLAY_NAME_LENGTH) {
            name = name.substring(name.length() - MAX_DISPLAY_NAME_LENGTH);
        }
        return name.isEmpty() ? "file." + fallbackExtension : name;
    }

    private static Kind sniffImage(byte[] h) {
        if (startsWith(h, 0x89, 'P', 'N', 'G')) {
            return Kind.PNG;
        }
        if (startsWith(h, 0xFF, 0xD8, 0xFF)) {
            return Kind.JPEG;
        }
        if (startsWith(h, 'G', 'I', 'F', '8')) {
            return Kind.GIF;
        }
        if (h.length >= 12 && startsWith(h, 'R', 'I', 'F', 'F') && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') {
            return Kind.WEBP;
        }
        return null;
    }

    private static boolean matchesDocumentKind(Kind kind, InputStream in) throws IOException {
        return switch (kind) {
            case PDF -> startsWith(in.readNBytes(5), '%', 'P', 'D', 'F', '-');
            case OLE -> startsWith(in.readNBytes(4), 0xD0, 0xCF, 0x11, 0xE0);
            case ZIP -> startsWith(in.readNBytes(2), 'P', 'K');
            case TEXT -> isPlainText(in.readNBytes(TEXT_SCAN_BYTES));
            default -> false;
        };
    }

    private static boolean isPlainText(byte[] sample) {
        for (byte b : sample) {
            if (b == 0) {
                return false;
            }
        }
        return true;
    }

    private static boolean startsWith(byte[] actual, int... expected) {
        if (actual.length < expected.length) {
            return false;
        }
        for (int i = 0; i < expected.length; i++) {
            if ((actual[i] & 0xFF) != expected[i]) {
                return false;
            }
        }
        return true;
    }
}
