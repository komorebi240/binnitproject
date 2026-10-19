package com.company.project.common.storage;

import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;

/**
 * Builds the HTTP response for an attachment. Images and videos render in the page ({@code inline}) unless a download was
 * asked for; everything else is forced to download as an opaque type. The content type always comes from the server-side
 * record (never the client), and nosniff stops a browser re-guessing it. The body is a {@link Resource}, so Spring answers
 * a Range request with 206 Partial Content - what a video player needs to start quickly and to seek.
 */
public final class AttachmentDownloads {

    private AttachmentDownloads() {
    }

    public static ResponseEntity<Resource> respond(Resource data, String fileName, String contentType, boolean inline) {
        ContentDisposition disposition = (inline ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(fileName, StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(inline ? contentType : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(data);
    }
}
