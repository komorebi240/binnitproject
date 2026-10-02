package com.company.project.common.storage;

import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Builds the HTTP response for an attachment download. Images render inline; everything else is
 * forced to download as an opaque type. The content type always comes from the server-side
 * record (never the client), and nosniff stops a browser re-guessing it.
 */
public final class AttachmentDownloads {

    private AttachmentDownloads() {
    }

    public static ResponseEntity<InputStreamResource> respond(
            InputStream data, long sizeBytes, String fileName, String contentType, boolean image) {
        ContentDisposition disposition = (image ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(fileName, StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image ? contentType : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .contentLength(sizeBytes)
                .body(new InputStreamResource(data));
    }
}
